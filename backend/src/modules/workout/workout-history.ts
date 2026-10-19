import { and, desc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { sessionExercises, sessionSets, workoutSessions } from "../../db/schema";

export function lastExerciseWeight(userId: number, name: string, fallback: number | null): number | null {
  const previousExercise = db.select({ sessionId: workoutSessions.sessionId })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
    .innerJoin(sessionSets, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
    .where(and(
      eq(workoutSessions.userId, userId),
      sql`${workoutSessions.completedAt} IS NOT NULL`,
      sql`LOWER(TRIM(${sessionExercises.exerciseName})) = LOWER(TRIM(${name}))`,
      eq(sessionSets.completed, 1)
    ))
    .orderBy(desc(workoutSessions.startedAt), desc(workoutSessions.sessionId))
    .limit(1).get();
  const previousWeight = previousExercise ? db.select({ weight: sql<number | null>`MAX(${sessionSets.weight})` })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
    .where(and(
      eq(sessionExercises.sessionId, previousExercise.sessionId),
      sql`LOWER(TRIM(${sessionExercises.exerciseName})) = LOWER(TRIM(${name}))`,
      eq(sessionSets.completed, 1)
    )).get()?.weight ?? null : fallback;

  return previousWeight;
}
