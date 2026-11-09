import { eq } from "drizzle-orm";
import { app } from "../../index";
import db from "../../db/client";
import { workoutSessions } from "../../db/schema";
import type { WorkoutService } from "./index";

export async function login(username: string) {
  const res = await app.handle(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: username }),
  }));
  const match = res.headers.get("set-cookie")?.match(/session_id=([^;]+)/);
  return `session_id=${match![1]}`;
}

export function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    headers: { Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
}

export function finishedSession(workout: WorkoutService, userId: number, exercises: Parameters<WorkoutService["sessions"]["update"]>[2]["exercises"], durationSeconds = 600) {
  const s = workout.sessions.create(userId, undefined, true);
  workout.sessions.update(s.sessionId, userId, { exercises });
  const startedAt = new Date(Date.now() - 3600 * 1000).toISOString();
  db.update(workoutSessions).set({ startedAt }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
  workout.sessions.complete(s.sessionId, userId, new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString());
  return s.sessionId;
}
