import { and, desc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { sessionExercises, sessionSets, templateExercises, workoutSessions, workoutTemplates } from "../../db/schema";
import { orNotFound } from "../../utils/errors";
import { normalizeSearchString } from "../../utils/search";
import { exerciseKey, sessionMatchesQuery } from "./workout-helpers";

type TemplateDefaults = typeof templateExercises.$inferSelect;

function templateExerciseSummary(templateEx: Partial<TemplateDefaults> | undefined) {
  if (!templateEx) return null;
  return {
    defaultReps: templateEx.defaultReps,
    defaultWeight: templateEx.defaultWeight,
    defaultDistance: templateEx.defaultDistance,
    defaultDuration: templateEx.defaultDuration,
    defaultRpe: templateEx.defaultRpe,
    defaultHeartRate: templateEx.defaultHeartRate,
    defaultRestTime: templateEx.defaultRestTime,
    equipment: templateEx.equipment,
    perSide: templateEx.perSide,
    isAssisted: templateEx.isAssisted,
  };
}

export class WorkoutSessionReader {
  list(userId: number, status?: string, q?: string) {
    const conditions = [eq(workoutSessions.userId, userId)];

    if (status === "active") {
      conditions.push(sql`completed_at IS NULL`);
    } else if (status === "completed") {
      conditions.push(sql`completed_at IS NOT NULL`);
    }

    const sessions = db.select({
      sessionId: workoutSessions.sessionId,
      templateId: workoutSessions.templateId,
      userId: workoutSessions.userId,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      notes: workoutSessions.notes,
      name: workoutSessions.name,
      exerciseCount: sql<number>`(SELECT COUNT(*) FROM session_exercises WHERE session_exercises.session_id = workout_sessions.session_id)`,
      completedSetsCount: sql<number>`(SELECT COUNT(*) FROM session_sets INNER JOIN session_exercises ON session_sets.session_exercise_id = session_exercises.session_exercise_id WHERE session_exercises.session_id = workout_sessions.session_id AND session_sets.completed = 1)`,
      totalSetsCount: sql<number>`(SELECT COUNT(*) FROM session_sets INNER JOIN session_exercises ON session_sets.session_exercise_id = session_exercises.session_exercise_id WHERE session_exercises.session_id = workout_sessions.session_id)`
    })
    .from(workoutSessions)
    .where(and(...conditions))
    .orderBy(desc(workoutSessions.startedAt))
    .all();

    if (!q) return sessions;

    const normalizedQ = normalizeSearchString(q);
    return sessions.filter((session) => sessionMatchesQuery(session.startedAt, session.name, session.notes, normalizedQ));
  }

  get(id: number, userId: number) {
    const session = orNotFound(
      db.select().from(workoutSessions)
        .where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId)))
        .get(),
      "workout.sessionNotFound",
    );

    const exercises = db.select()
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, id))
      .orderBy(sessionExercises.sortOrder, sessionExercises.sessionExerciseId)
      .all();

    const templateByName = new Map<string, TemplateDefaults[]>();
    if (session.templateId) {
      const templateExs = db.select()
        .from(templateExercises)
        .where(eq(templateExercises.templateId, session.templateId))
        .orderBy(templateExercises.sortOrder, templateExercises.templateExerciseId)
        .all();
      for (const te of templateExs) {
        const key = exerciseKey(te.exerciseName);
        if (!templateByName.has(key)) templateByName.set(key, []);
        templateByName.get(key)!.push(te);
      }
    }

    const occurrences = new Map<string, number>();
    const sessionWithSets = exercises.map((ex) => {
      const sets = db.select()
        .from(sessionSets)
        .where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId))
        .orderBy(sessionSets.setNumber)
        .all();

      const key = exerciseKey(ex.exerciseName);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      const candidates = templateByName.get(key);
      const templateEx = candidates?.[occurrence] ?? candidates?.[0] ?? this.templateDefaultsByName(ex.exerciseName, userId);

      return { ...ex, sets, templateExercise: templateExerciseSummary(templateEx) };
    });

    return { ...session, exercises: sessionWithSets };
  }

  private templateDefaultsByName(exerciseName: string, userId: number) {
    return db.select({
      defaultReps: templateExercises.defaultReps,
      defaultWeight: templateExercises.defaultWeight,
      defaultDistance: templateExercises.defaultDistance,
      defaultDuration: templateExercises.defaultDuration,
      defaultRpe: templateExercises.defaultRpe,
      defaultHeartRate: templateExercises.defaultHeartRate,
      defaultRestTime: templateExercises.defaultRestTime,
      equipment: templateExercises.equipment,
      perSide: templateExercises.perSide,
      isAssisted: templateExercises.isAssisted,
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(and(sql`LOWER(${templateExercises.exerciseName}) = LOWER(${exerciseName})`, eq(workoutTemplates.userId, userId)))
      .limit(1)
      .get();
  }
}
