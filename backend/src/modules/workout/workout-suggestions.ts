import { eq, and, or, like, desc, sql } from "drizzle-orm";
import db from "../../db/client";
import { workoutTemplates, templateExercises, workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";
import { parseDateString, formatDutchDate } from "./workout-helpers";
import { WorkoutSessionService } from "./workout-sessions";

export class WorkoutSuggestionService extends WorkoutSessionService {
  suggestExercises(userId: number, q: string) {
    const normalizedQ = normalizeSearchString(q);
    if (!normalizedQ) return [];

    const fromSessions = db.select({
      sessionExerciseId: sessionExercises.sessionExerciseId,
      name: sessionExercises.exerciseName,
      category: sessionExercises.category,
      equipment: sessionExercises.equipment,
      perSide: sessionExercises.perSide,
      isAssisted: sessionExercises.isAssisted,
      completedAt: workoutSessions.completedAt,
      startedAt: workoutSessions.startedAt,
      sessionId: workoutSessions.sessionId,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        like(sqlNormalize(sessionExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .orderBy(sql`${workoutSessions.completedAt} DESC`, sql`${workoutSessions.startedAt} DESC`, sql`${workoutSessions.sessionId} DESC`)
      .all();

    const fromTemplates = db.select({
      name: templateExercises.exerciseName,
      category: templateExercises.category,
      defaultSets: templateExercises.defaultSets,
      defaultReps: templateExercises.defaultReps,
      defaultWeight: templateExercises.defaultWeight,
      defaultDistance: templateExercises.defaultDistance,
      defaultDuration: templateExercises.defaultDuration,
      defaultRestTime: templateExercises.defaultRestTime,
      equipment: templateExercises.equipment,
      perSide: templateExercises.perSide,
      isAssisted: templateExercises.isAssisted,
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(and(
        like(sqlNormalize(templateExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutTemplates.userId, userId)
      ))
      .all();

    const uniqueExercisesMap = new Map<
      string,
      {
        name: string;
        category: string;
        equipment: string | null;
        perSide: number;
        isAssisted: number;
        defaultSets: number;
        defaultReps: number | null;
        defaultWeight: number | null;
        defaultDistance: number | null;
        defaultDuration: number | null;
        defaultRestTime: number | null;
        lastSets: Array<{
          setNumber: number;
          reps: number | null;
          weight: number | null;
          distance: number | null;
          duration: number | null;
          rpe: number | null;
          heartRate: number | null;
        }>;
      }
    >();

    for (const r of fromSessions) {
      const key = r.name.trim().toLowerCase();
      if (!uniqueExercisesMap.has(key)) {
        const sets = db.select({
          setNumber: sessionSets.setNumber,
          reps: sessionSets.reps,
          weight: sessionSets.weight,
          distance: sessionSets.distance,
          duration: sessionSets.duration,
          rpe: sessionSets.rpe,
          heartRate: sessionSets.heartRate,
        })
          .from(sessionSets)
          .where(eq(sessionSets.sessionExerciseId, r.sessionExerciseId))
          .orderBy(sessionSets.setNumber)
          .all();

        const lastSetWithValues = sets.slice().reverse().find(s => s.reps != null || s.weight != null || s.distance != null || s.duration != null) ?? sets[sets.length - 1];
        const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;

        uniqueExercisesMap.set(key, {
          name: r.name,
          category: r.category ?? "Free Weights",
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
          isAssisted: r.isAssisted ?? 0,
          defaultSets: sets.length > 0 ? sets.length : 3,
          defaultReps: lastSetWithValues?.reps ?? (sets[0]?.reps ?? 10),
          defaultWeight: lastSetWithValues?.weight ?? (sets[0]?.weight ?? null),
          defaultDistance: lastSetWithValues?.distance ?? (sets[0]?.distance ?? null),
          defaultDuration: lastSetWithValues?.duration ?? (sets[0]?.duration ?? null),
          defaultRestTime: null,
          lastSets: sets.map((s, idx) => ({
            setNumber: s.setNumber || idx + 1,
            reps: s.reps ?? null,
            weight: s.weight ?? null,
            distance: s.distance ?? null,
            duration: s.duration ?? null,
            rpe: s.rpe ?? null,
            heartRate: s.heartRate ?? null,
          })),
        });
      }
    }

    for (const r of fromTemplates) {
      const key = r.name.trim().toLowerCase();
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;

      if (uniqueExercisesMap.has(key)) {
        const existing = uniqueExercisesMap.get(key)!;
        if (existing.defaultRestTime == null && r.defaultRestTime != null) {
          existing.defaultRestTime = r.defaultRestTime;
        }
        if (!existing.isAssisted && r.isAssisted) {
          existing.isAssisted = r.isAssisted;
        }
      } else {
        const numSets = r.defaultSets || 3;
        const numReps = r.defaultReps ?? 10;
        const templateSets = [];
        for (let i = 1; i <= numSets; i++) {
          templateSets.push({
            setNumber: i,
            reps: numReps,
            weight: r.defaultWeight ?? null,
            distance: r.defaultDistance ?? null,
            duration: r.defaultDuration ?? null,
            rpe: null,
            heartRate: null,
          });
        }

        uniqueExercisesMap.set(key, {
          name: r.name,
          category: r.category ?? "Free Weights",
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
          isAssisted: r.isAssisted ?? 0,
          defaultSets: numSets,
          defaultReps: numReps,
          defaultWeight: r.defaultWeight ?? null,
          defaultDistance: r.defaultDistance ?? null,
          defaultDuration: r.defaultDuration ?? null,
          defaultRestTime: r.defaultRestTime ?? null,
          lastSets: templateSets,
        });
      }
    }

    return Array.from(uniqueExercisesMap.values()).slice(0, 10).map((data) => ({
      type: "exercise" as const,
      value: data.name,
      category: data.category,
      defaultSets: data.defaultSets,
      defaultReps: data.defaultReps,
      defaultWeight: data.defaultWeight,
      defaultDistance: data.defaultDistance,
      defaultDuration: data.defaultDuration,
      defaultRestTime: data.defaultRestTime,
      equipment: data.equipment,
      perSide: data.perSide,
      isAssisted: data.isAssisted,
      lastSets: data.lastSets,
    }));
  }

  suggestWorkoutSearch(userId: number, q: string) {
    const normalizedQ = normalizeSearchString(q);

    const exercises = this.suggestExercises(userId, q).slice(0, 5);

    const templates = db.select({
      templateId: workoutTemplates.templateId,
      name: workoutTemplates.name,
      description: workoutTemplates.description,
      targetMuscleGroups: workoutTemplates.targetMuscleGroups
    })
      .from(workoutTemplates)
      .where(and(
        eq(workoutTemplates.userId, userId),
        or(
          like(sqlNormalize(workoutTemplates.name), `%${normalizedQ}%`),
          like(sqlNormalize(workoutTemplates.description), `%${normalizedQ}%`),
          like(sqlNormalize(workoutTemplates.targetMuscleGroups), `%${normalizedQ}%`)
        )
      ))
      .limit(5)
      .all();

    const templateSuggestions = templates.map(t => ({
      type: "template" as const,
      value: t.name,
      id: t.templateId
    }));

    const sessions = db.select({
      sessionId: workoutSessions.sessionId,
      name: workoutSessions.name,
      notes: workoutSessions.notes,
      startedAt: workoutSessions.startedAt
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`completed_at IS NOT NULL`
      ))
      .orderBy(desc(workoutSessions.startedAt))
      .all();

    const historySuggestions = sessions
      .map(session => {
        const dateObj = parseDateString(session.startedAt);
        const formattedDate = formatDutchDate(dateObj, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        
        const nameNorm = normalizeSearchString(session.name || "");
        const notesNorm = normalizeSearchString(session.notes || "");
        const dateNorm = normalizeSearchString(formattedDate);

        const dateLong = formatDutchDate(dateObj, {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const dateLongNorm = normalizeSearchString(dateLong);

        const dayStr = String(dateObj.getDate()).padStart(2, "0");
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, "0");
        const yearStr = String(dateObj.getFullYear());
        const dayRaw = String(dateObj.getDate());
        const monthRaw = String(dateObj.getMonth() + 1);

        const datePadded = `${dayStr}${monthStr}${yearStr}`;
        const datePaddedShort = `${dayStr}${monthStr}`;
        const dateUnpadded = `${dayRaw}${monthRaw}${yearStr}`;
        const dateUnpaddedShort = `${dayRaw}${monthRaw}`;

        const isMatch =
          nameNorm.includes(normalizedQ) ||
          notesNorm.includes(normalizedQ) ||
          dateNorm.includes(normalizedQ) ||
          dateLongNorm.includes(normalizedQ) ||
          datePadded.includes(normalizedQ) ||
          datePaddedShort.includes(normalizedQ) ||
          dateUnpadded.includes(normalizedQ) ||
          dateUnpaddedShort.includes(normalizedQ);

        return {
          isMatch,
          type: "history" as const,
          value: `${session.name || "Training"} - ${formattedDate}`,
          id: session.sessionId
        };
      })
      .filter(s => s.isMatch)
      .slice(0, 5)
      .map(({ type, value, id }) => ({ type, value, id }));

    return [
      ...exercises,
      ...templateSuggestions,
      ...historySuggestions
    ];
  }
}
