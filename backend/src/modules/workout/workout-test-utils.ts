import { eq } from "drizzle-orm";
import db from "../../db/client";
import { workoutSessions } from "../../db/schema";
import type { WorkoutService } from "./index";

export function finishedSession(
  workout: WorkoutService,
  userId: number,
  exercises: Parameters<WorkoutService["sessions"]["update"]>[2]["exercises"],
  durationSeconds = 600,
) {
  const s = workout.sessions.create(userId, undefined, true);
  workout.sessions.update(s.sessionId, userId, { exercises });
  const startedAt = new Date(Date.now() - 3600 * 1000).toISOString();
  db.update(workoutSessions).set({ startedAt }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
  workout.sessions.complete(
    s.sessionId,
    userId,
    new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
  );
  return s.sessionId;
}
