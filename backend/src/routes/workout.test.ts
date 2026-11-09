import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../db/client";
import { app } from "../index";
import { measurements, workoutSessions, workoutTemplates } from "../db/schema";
import { call, login } from "../modules/workout/workout-test-utils";
import { setupTestDb } from "../test-utils";

function resetWorkoutData(adminId: number, testerId: number) {
  for (const userId of [adminId, testerId]) {
    db.delete(workoutSessions).where(eq(workoutSessions.userId, userId)).run();
    db.delete(workoutTemplates).where(eq(workoutTemplates.userId, userId)).run();
    db.delete(measurements).where(eq(measurements.userId, userId)).run();
  }
}

describe("workout routes error contract", () => {
  let cookie: string;
  let testerCookie: string;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    resetWorkoutData(adminId, testerId);
    cookie = await login("admin");
    testerCookie = await login("tester");
  });

  afterAll(async () => {
    const ids = await setupTestDb();
    resetWorkoutData(ids.adminId, ids.testerId);
  });

  it("maps NotFoundError to 404 with module keys", async () => {
    const cases: [string, string, unknown, string][] = [
      ["GET", "/api/workouts/templates/999999", undefined, "workout.templateNotFound"],
      ["PUT", "/api/workouts/templates/999999", { name: "x" }, "workout.templateNotFound"],
      ["DELETE", "/api/workouts/templates/999999", undefined, "workout.templateNotFound"],
      ["GET", "/api/workouts/sessions/999999", undefined, "workout.sessionNotFound"],
      ["PATCH", "/api/workouts/sessions/999999", { name: "x" }, "workout.sessionNotFound"],
      ["PATCH", "/api/workouts/sessions/999999/complete", {}, "workout.sessionNotFound"],
      ["DELETE", "/api/workouts/sessions/999999", undefined, "workout.sessionNotFound"],
      ["PUT", "/api/measurements/999999", { weight: 1 }, "workout.measurementNotFound"],
      ["DELETE", "/api/measurements/999999", undefined, "workout.measurementNotFound"],
      [
        "POST",
        "/api/measurements/999999/photos",
        { filePath: `/api/uploads/measurement_${crypto.randomUUID()}.jpg` },
        "workout.measurementNotFound",
      ],
      ["DELETE", "/api/measurements/photos/999999", undefined, "workout.photoNotFound"],
      ["GET", `/api/uploads/${crypto.randomUUID()}.jpg`, undefined, "common.notFound"],
    ];
    for (const [method, path, body, key] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, res.status, await res.json()]).toEqual([method, path, 404, { error: key }]);
    }
  });

  it("does not reveal another user's records", async () => {
    const template = (await (
      await call(testerCookie, "POST", "/api/workouts/templates", { name: "Private" })
    ).json()) as { templateId: number };
    const session = (await (await call(testerCookie, "POST", "/api/workouts/sessions", { force: true })).json()) as {
      sessionId: number;
    };
    for (const path of [
      `/api/workouts/templates/${template.templateId}`,
      `/api/workouts/sessions/${session.sessionId}`,
    ]) {
      const res = await call(cookie, "GET", path);
      expect(res.status).toBe(404);
    }
  });

  it("maps ValidationError to 400 with keys and details", async () => {
    const cases: [string, string, unknown, Record<string, unknown>][] = [
      ["POST", "/api/workouts/templates", { name: "  " }, { error: "workout.templateNameRequired" }],
      ["POST", "/api/workouts/templates", { name: "x", estimatedTime: -1 }, { error: "workout.estimatedTimeNegative" }],
      [
        "POST",
        "/api/workouts/templates",
        { name: "x", exercises: [{ exerciseName: "Row", sets: 0 }] },
        { error: "workout.exerciseNeedsSet", exerciseName: "Row" },
      ],
      [
        "POST",
        "/api/workouts/templates",
        { name: "x", exercises: [{ exerciseName: "Row", sets: 3, reps: -1 }] },
        { error: "workout.repsNegative" },
      ],
      [
        "POST",
        "/api/workouts/templates",
        { name: "x", exercises: [{ exerciseName: "Row", sets: 3, rpe: 11 }] },
        { error: "workout.rpeRange" },
      ],
      [
        "PATCH",
        "/api/workouts/templates/reorder",
        { templateIds: [999999] },
        { error: "workout.templateOrderInvalid" },
      ],
      [
        "POST",
        "/api/workouts/exercises/merge",
        { sourceName: "", targetName: "b" },
        { error: "workout.exerciseNamesRequired" },
      ],
      [
        "POST",
        "/api/workouts/exercises/merge",
        { sourceName: "a", targetName: "a" },
        { error: "workout.exerciseNamesSame" },
      ],
      ["POST", "/api/workouts/sessions", { templateId: 0.5 }, { error: "workout.invalidId" }],
      ["POST", "/api/measurements", { date: "2026-02-30" }, { error: "workout.invalidMeasurementDate" }],
      [
        "POST",
        "/api/measurements",
        { date: "2026-03-01", weight: -1 },
        { error: "workout.measurementNegative", field: "weight" },
      ],
      ["PUT", "/api/measurements/0", { weight: 1 }, { error: "workout.invalidId" }],
      ["POST", "/api/measurements/1/photos", { filePath: "../../sbase.db" }, { error: "workout.invalidPhotoPath" }],
    ];
    for (const [method, path, body, expected] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, res.status, await res.json()]).toEqual([method, path, 400, expected]);
    }
  });

  it("reports exercises that do not belong to the session with their id", async () => {
    const session = (await (await call(cookie, "POST", "/api/workouts/sessions", { force: true })).json()) as {
      sessionId: number;
    };
    const res = await call(cookie, "PATCH", `/api/workouts/sessions/${session.sessionId}`, {
      exercises: [{ sessionExerciseId: 987654, exerciseName: "Ghost", sortOrder: 0, sets: [] }],
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "workout.exerciseNotInSession", sessionExerciseId: 987654 });
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases: [string, string, unknown][] = [
      ["POST", "/api/workouts/templates", { name: 5 }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: "a", sets: "3" }] }],
      ["PATCH", "/api/workouts/templates/reorder", { templateIds: "nope" }],
      ["GET", "/api/workouts/templates/abc", undefined],
      ["POST", "/api/workouts/sessions", { templateId: "abc" }],
      ["PATCH", "/api/workouts/sessions/1", { notes: 12 }],
      [
        "PATCH",
        "/api/workouts/sessions/1",
        { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: null }] }] },
      ],
      ["POST", "/api/measurements", { date: "2026-03-01", weight: "heavy" }],
      ["PUT", "/api/measurements/abc", { weight: 1 }],
      ["POST", "/api/measurements/1/photos", {}],
      ["DELETE", "/api/measurements/photos/abc", undefined],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, res.status, await res.json()]).toEqual([
        method,
        path,
        400,
        { error: "common.invalidRequest" },
      ]);
    }
  });

  it("maps ConflictError to 409 and keeps the running session in the body", async () => {
    const first = (await (await call(cookie, "POST", "/api/workouts/sessions", {})).json()) as { sessionId: number };
    const res = await call(cookie, "POST", "/api/workouts/sessions", {});
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; activeSession: { sessionId: number } };
    expect(body.error).toBe("workout.activeSessionExists");
    expect(body.activeSession.sessionId).toBe(first.sessionId);

    await call(cookie, "POST", "/api/measurements", { date: "2026-03-01", weight: 80 });
    const other = (await (
      await call(cookie, "POST", "/api/measurements", { date: "2026-03-02", weight: 81 })
    ).json()) as { measurementId: number };
    const clash = await call(cookie, "PUT", `/api/measurements/${other.measurementId}`, { date: "2026-03-01" });
    expect(clash.status).toBe(409);
    expect(await clash.json()).toMatchObject({ error: "workout.measurementDateExists", date: "2026-03-01" });
  });

  it("accepts the payload shapes the offline sync and the forms send", async () => {
    const created = await call(cookie, "POST", "/api/workouts/sessions", { templateId: undefined });
    expect(created.status).toBe(200);
    const session = (await created.json()) as { sessionId: number };

    const sync = await call(cookie, "PATCH", `/api/workouts/sessions/${session.sessionId}`, {
      name: "Push",
      notes: null,
      completedAt: null,
      pausedAt: null,
      pausedSeconds: 0,
      exercises: [
        {
          exerciseName: "Bench",
          sortOrder: 0,
          category: "resistance",
          equipment: "none",
          perSide: 0,
          isAssisted: 0,
          sets: [
            {
              setNumber: 1,
              reps: null,
              weight: 50,
              distance: null,
              duration: null,
              rpe: null,
              heartRate: null,
              completed: 1,
              editedFields: null,
            },
          ],
        },
      ],
    });
    expect(sync.status).toBe(200);

    const bare = await app.handle(
      new Request(`http://localhost/api/workouts/sessions/${session.sessionId}/complete`, {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      }),
    );
    expect(bare.status).toBe(200);
    expect(((await bare.json()) as { completedAt: string | null }).completedAt).not.toBeNull();

    const template = await call(cookie, "POST", "/api/workouts/templates", {
      name: "Form",
      description: null,
      targetMuscleGroups: null,
      estimatedTime: null,
      exercises: [
        {
          exerciseName: "Row",
          category: "resistance",
          sets: 3,
          reps: 8,
          weight: null,
          distance: null,
          duration: null,
          defaultRestTime: 90,
          equipment: "none",
          perSide: 0,
          isAssisted: 0,
        },
      ],
    });
    expect(template.status).toBe(200);

    const measurement = await call(cookie, "POST", "/api/measurements", {
      date: "2026-04-01",
      height: null,
      weight: 80,
      waist: null,
    });
    expect(measurement.status).toBe(200);
  });

  it("keeps the 401 body of the upload route for anonymous requests", async () => {
    const anon = await app.handle(new Request(`http://localhost/api/uploads/${crypto.randomUUID()}.jpg`));
    expect(anon.status).toBe(401);
    expect(await anon.json()).toEqual({ error: "Unauthorized" });
  });
});
