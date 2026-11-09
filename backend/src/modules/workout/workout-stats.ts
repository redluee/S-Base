import { eq, and, desc, sql, ne } from "drizzle-orm";
import db from "../../db/client";
import { workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import type { PersonalRecord } from "../../types/shared";
import { parseDateString, exerciseKey, signedWeight, effectiveVolume, activeSeconds } from "./workout-helpers";

export class WorkoutStats {
  summary(userId: number) {
    const lastSession = db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`${workoutSessions.completedAt} IS NOT NULL`))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(1)
      .get();

    let daysAgo: number | null = null;
    if (lastSession?.completedAt) {
      const completedDate = parseDateString(lastSession.completedAt);
      const today = new Date();
      const date1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const date2 = Date.UTC(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
      daysAgo = Math.floor((date1 - date2) / (1000 * 60 * 60 * 24));
    }

    const workoutCountRes = db
      .select({
        count: sql<number>`count(${workoutSessions.sessionId})`,
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`${workoutSessions.completedAt} IS NOT NULL`))
      .get();

    const totalWorkouts = workoutCountRes?.count ?? 0;

    const volumeRes = db
      .select({
        volume: sql<number>`sum(max(coalesce(${sessionSets.weight}, 0), 0) * coalesce(${sessionSets.reps}, 0))`,
      })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          sql`${workoutSessions.completedAt} IS NOT NULL`,
          eq(sessionSets.completed, 1),
        ),
      )
      .get();

    const totalVolume = volumeRes?.volume ?? 0;

    return {
      daysAgo,
      totalWorkouts,
      totalVolume,
    };
  }

  sessionPRs(sessionId: number, userId: number, currentDurationSeconds?: number): PersonalRecord[] {
    const currentSession = db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.sessionId, sessionId), eq(workoutSessions.userId, userId)))
      .get();
    if (!currentSession) return [];

    const currentSets = db
      .select({
        exerciseName: sessionExercises.exerciseName,
        isAssisted: sessionExercises.isAssisted,
        reps: sessionSets.reps,
        weight: sessionSets.weight,
        distance: sessionSets.distance,
        duration: sessionSets.duration,
        completed: sessionSets.completed,
      })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .where(and(eq(sessionExercises.sessionId, sessionId), eq(sessionSets.completed, 1)))
      .all();

    const previousSessions = db
      .select({
        sessionId: workoutSessions.sessionId,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        pausedAt: workoutSessions.pausedAt,
        pausedSeconds: workoutSessions.pausedSeconds,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          sql`${workoutSessions.completedAt} IS NOT NULL`,
          ne(workoutSessions.sessionId, sessionId),
        ),
      )
      .all();

    const previousSets = db
      .select({
        exerciseName: sessionExercises.exerciseName,
        isAssisted: sessionExercises.isAssisted,
        sessionId: sessionExercises.sessionId,
        reps: sessionSets.reps,
        weight: sessionSets.weight,
        distance: sessionSets.distance,
        duration: sessionSets.duration,
      })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          sql`${workoutSessions.completedAt} IS NOT NULL`,
          ne(workoutSessions.sessionId, sessionId),
          eq(sessionSets.completed, 1),
        ),
      )
      .all();

    const prs: PersonalRecord[] = [];

    const currentByExercise = new Map<string, { displayName: string; sets: typeof currentSets }>();
    for (const s of currentSets) {
      const key = exerciseKey(s.exerciseName);
      if (!currentByExercise.has(key)) currentByExercise.set(key, { displayName: s.exerciseName.trim(), sets: [] });
      currentByExercise.get(key)!.sets.push(s);
    }

    const previousByExercise = new Map<string, typeof previousSets>();
    for (const s of previousSets) {
      const key = exerciseKey(s.exerciseName);
      if (!previousByExercise.has(key)) previousByExercise.set(key, []);
      previousByExercise.get(key)!.push(s);
    }

    const maxOf = (values: number[]) => (values.length > 0 ? Math.max(...values) : 0);
    const sumBySession = (sets: typeof previousSets, fn: (s: (typeof previousSets)[number]) => number) => {
      const totals = new Map<number, number>();
      for (const s of sets) totals.set(s.sessionId, (totals.get(s.sessionId) ?? 0) + fn(s));
      return Array.from(totals.values());
    };

    for (const [key, { displayName: exerciseName, sets: cSets }] of currentByExercise) {
      const pSets = previousByExercise.get(key) ?? [];
      if (pSets.length === 0) continue;

      const cWeighted = cSets.filter((s) => s.weight != null);
      const pWeighted = pSets.filter((s) => s.weight != null);
      if (cWeighted.length > 0 && pWeighted.length > 0) {
        const cMaxWeight = Math.max(...cWeighted.map((s) => signedWeight(s.weight, s.isAssisted)!));
        const pMaxWeight = Math.max(...pWeighted.map((s) => signedWeight(s.weight, s.isAssisted)!));
        const assisted = cWeighted.every((s) => s.isAssisted) && pWeighted.every((s) => s.isAssisted);
        if (assisted) {
          if (cMaxWeight > pMaxWeight) {
            prs.push({
              type: "weight",
              exerciseName,
              prevValue: Math.abs(pMaxWeight),
              newValue: Math.abs(cMaxWeight),
              unit: "kg",
              assisted: true,
            });
          }
        } else if (cMaxWeight !== 0 && cMaxWeight > pMaxWeight) {
          prs.push({ type: "weight", exerciseName, prevValue: pMaxWeight, newValue: cMaxWeight, unit: "kg" });
        }
      }

      const cMaxReps = maxOf(cSets.map((s) => s.reps ?? 0));
      const pMaxReps = maxOf(pSets.map((s) => s.reps ?? 0));
      if (pMaxReps > 0 && cMaxReps > pMaxReps) {
        prs.push({ type: "reps", exerciseName, prevValue: pMaxReps, newValue: cMaxReps, unit: "reps" });
      }

      const cSetsCount = cSets.length;
      const pMaxSetsCount = maxOf(sumBySession(pSets, () => 1));
      if (cSetsCount > pMaxSetsCount) {
        prs.push({ type: "sets", exerciseName, prevValue: pMaxSetsCount, newValue: cSetsCount, unit: "sets" });
      }

      const cVolume = cSets.reduce((sum, s) => sum + effectiveVolume(s.weight, s.reps), 0);
      const pMaxVolume = maxOf(sumBySession(pSets, (s) => effectiveVolume(s.weight, s.reps)));
      if (pMaxVolume > 0 && cVolume > pMaxVolume) {
        prs.push({ type: "volume", exerciseName, prevValue: pMaxVolume, newValue: cVolume, unit: "kg" });
      }

      const cMaxDistance = maxOf(cSets.map((s) => s.distance ?? 0));
      const pMaxDistance = maxOf(pSets.map((s) => s.distance ?? 0));
      if (pMaxDistance > 0 && cMaxDistance > pMaxDistance) {
        prs.push({ type: "distance", exerciseName, prevValue: pMaxDistance, newValue: cMaxDistance, unit: "km" });
      }

      const cMaxDuration = maxOf(cSets.map((s) => s.duration ?? 0));
      const pMaxDuration = maxOf(pSets.map((s) => s.duration ?? 0));
      if (pMaxDuration > 0 && cMaxDuration > pMaxDuration) {
        prs.push({ type: "duration", exerciseName, prevValue: pMaxDuration, newValue: cMaxDuration, unit: "sec" });
      }
    }

    if (previousSessions.length === 0) return prs;

    const cSessionVolume = currentSets.reduce((sum, s) => sum + effectiveVolume(s.weight, s.reps), 0);
    const pMaxSessionVolume = maxOf(sumBySession(previousSets, (s) => effectiveVolume(s.weight, s.reps)));
    if (pMaxSessionVolume > 0 && cSessionVolume > pMaxSessionVolume) {
      prs.push({ type: "session_volume", prevValue: pMaxSessionVolume, newValue: cSessionVolume, unit: "kg" });
    }

    const cSessionDuration =
      currentDurationSeconds !== undefined ? currentDurationSeconds : activeSeconds(currentSession, Date.now());
    const pMaxSessionDuration = maxOf(previousSessions.map((s) => activeSeconds(s, 0)));
    if (pMaxSessionDuration > 0 && cSessionDuration > pMaxSessionDuration) {
      prs.push({
        type: "session_duration",
        prevValue: Math.round(pMaxSessionDuration),
        newValue: Math.round(cSessionDuration),
        unit: "sec",
      });
    }

    const cSessionExerciseCount = currentByExercise.size;
    const pExercisesBySession = new Map<number, Set<string>>();
    for (const s of previousSets) {
      if (!pExercisesBySession.has(s.sessionId)) pExercisesBySession.set(s.sessionId, new Set());
      pExercisesBySession.get(s.sessionId)!.add(exerciseKey(s.exerciseName));
    }
    const pMaxSessionExercisesCount = maxOf(Array.from(pExercisesBySession.values()).map((set) => set.size));
    if (pMaxSessionExercisesCount > 0 && cSessionExerciseCount > pMaxSessionExercisesCount) {
      prs.push({
        type: "session_exercises",
        prevValue: pMaxSessionExercisesCount,
        newValue: cSessionExerciseCount,
        unit: "exercises",
      });
    }

    return prs;
  }
}
