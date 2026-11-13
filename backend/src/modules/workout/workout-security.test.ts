import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { app } from "../../index";
import { call, login } from "../../test-http";
import { WorkoutService } from "./index";
import db from "../../db/client";
import { workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("workout security and integrity", () => {
  let workout: WorkoutService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    workout = new WorkoutService();
  });

  it("SEC-01: rejects session updates that reference another user's exercise", () => {
    const victim = workout.sessions.create(testerId, undefined, true)!;
    const victimSession = workout.sessions.update(victim.sessionId, testerId, {
      exercises: [
        { exerciseName: "Victim Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] },
      ],
    })!;
    const victimExercise = victimSession.exercises[0];

    const attacker = workout.sessions.create(adminId, undefined, true)!;
    expect(() =>
      workout.sessions.update(attacker.sessionId, adminId, {
        exercises: [
          {
            sessionExerciseId: victimExercise.sessionExerciseId,
            exerciseName: "Hacked",
            sortOrder: 0,
            sets: [{ setNumber: 1, reps: 1, weight: 1 }],
          },
        ],
      }),
    ).toThrow("workout.exerciseNotInSession");

    const after = workout.sessions.get(victim.sessionId, testerId)!;
    expect(after.exercises[0].exerciseName).toBe("Victim Squat");
    expect(after.exercises[0].sets[0].weight).toBe(100);
  });

  it("SEC-01: rejects exercises from another session of the same user and does not remove them", () => {
    const a = workout.sessions.create(adminId, undefined, true)!;
    const aWith = workout.sessions.update(a.sessionId, adminId, {
      exercises: [{ exerciseName: "A Lift", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }],
    })!;
    const b = workout.sessions.create(adminId, undefined, true)!;
    expect(() =>
      workout.sessions.update(b.sessionId, adminId, {
        exercises: [{ sessionExerciseId: aWith.exercises[0].sessionExerciseId, exerciseName: "Moved", sortOrder: 0 }],
      }),
    ).toThrow("workout.exerciseNotInSession");
    expect(workout.sessions.get(a.sessionId, adminId)!.exercises[0].exerciseName).toBe("A Lift");
  });

  it("DATA-05: read endpoints do not delete stale empty sessions", () => {
    const stale = db
      .insert(workoutSessions)
      .values({
        userId: adminId,
        name: "Stale",
        startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      })
      .returning()
      .get();

    workout.sessions.list(adminId);
    workout.sessions.list(adminId, "active");
    workout.exercises.list(adminId);
    workout.stats.summary(adminId);

    expect(db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, stale.sessionId)).get()).toBeDefined();
  });

  it("DATA-06: updateTemplate rolls back fully when an exercise insert fails", () => {
    const template = workout.templates.create(adminId, {
      name: "Atomic",
      exercises: [{ exerciseName: "Keep Me", sets: 3, reps: 10 }],
    })!;

    const bad: Record<string, unknown> = { exerciseName: "Second", sets: 3, reps: 10 };
    Object.defineProperty(bad, "perSide", {
      get() {
        throw new Error("boom");
      },
      enumerable: true,
    });

    expect(() =>
      workout.templates.update(template.templateId, adminId, {
        name: "Renamed",
        exercises: [
          { exerciseName: "First", sets: 3, reps: 10 },
          { ...bad, exerciseName: "Second", perSide: undefined, defaultRestTime: Symbol("x") as unknown as number },
        ],
      }),
    ).toThrow();

    const after = workout.templates.get(template.templateId, adminId)!;
    expect(after.name).toBe("Atomic");
    expect(after.exercises.map((e) => e.exerciseName)).toEqual(["Keep Me"]);
  });

  it("DATA-06: mergeExercises is atomic", () => {
    const s = workout.sessions.create(adminId, undefined, true)!;
    workout.sessions.update(s.sessionId, adminId, {
      exercises: [
        { exerciseName: "Src", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Dst", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
      ],
    });
    workout.exercises.merge(adminId, "Src", "Dst");
    const after = workout.sessions.get(s.sessionId, adminId)!;
    expect(after.exercises.length).toBe(1);
    expect(after.exercises[0].sets.length).toBe(2);
  });

  it("DATA-07: validation problems return 400 instead of 500", async () => {
    const cookie = await login("admin");

    const cases: [string, string, unknown][] = [
      ["POST", "/api/workouts/templates", { name: null }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: null, sets: 3, reps: 5 }] }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: "a", sets: 0, reps: 5 }] }],
      ["POST", "/api/workouts/templates", { name: "x", estimatedTime: -5 }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: "a", sets: 3, reps: "many" }] }],
      ["PATCH", "/api/workouts/templates/reorder", { templateIds: [999999] }],
      ["POST", "/api/workouts/sessions", { templateId: "abc" }],
      ["POST", "/api/measurements", { date: "not-a-date" }],
      ["POST", "/api/measurements", { date: "2026-01-01", weight: "heavy" }],
      ["POST", "/api/workouts/exercises/merge", { sourceName: "a", targetName: "a" }],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, JSON.stringify(body), res.status]).toEqual([method, path, JSON.stringify(body), 400]);
    }

    const tpl = (await (await call(cookie, "POST", "/api/workouts/templates", { name: "Valid" })).json()) as {
      templateId: number;
    };
    const putNull = await call(cookie, "PUT", `/api/workouts/templates/${tpl.templateId}`, { name: null });
    expect(putNull.status).toBe(400);

    const sess = (await (await call(cookie, "POST", "/api/workouts/sessions", { force: true })).json()) as {
      sessionId: number;
    };
    const badBodies = [
      { exercises: [{ exerciseName: null, sortOrder: 0 }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: null }] }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: 1, reps: "x" }] }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: 1, rpe: 99 }] }] },
      { completedAt: "garbage" },
      { notes: 12 },
    ];
    for (const body of badBodies) {
      const res = await call(cookie, "PATCH", `/api/workouts/sessions/${sess.sessionId}`, body);
      expect([JSON.stringify(body), res.status]).toEqual([JSON.stringify(body), 400]);
    }
    const badComplete = await call(cookie, "PATCH", `/api/workouts/sessions/${sess.sessionId}/complete`, {
      completedAt: "garbage",
    });
    expect(badComplete.status).toBe(400);

    const nullBody = await app.handle(
      new Request("http://localhost/api/workouts/templates", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "null",
      }),
    );
    expect(nullBody.status).toBe(400);

    await call(cookie, "DELETE", `/api/workouts/templates/${tpl.templateId}`);
    await call(cookie, "DELETE", `/api/workouts/sessions/${sess.sessionId}`);
  });

  it("DATA-08: caps template sets and exercise counts", async () => {
    expect(() =>
      workout.templates.create(adminId, {
        name: "Huge",
        exercises: [{ exerciseName: "Squat", sets: 100000, reps: 5 }],
      }),
    ).toThrow("workout.tooManySets");
    expect(
      workout.templates.create(adminId, { name: "Max", exercises: [{ exerciseName: "Squat", sets: 50, reps: 5 }] })!
        .exercises[0].defaultSets,
    ).toBe(50);
    const many = Array.from({ length: 101 }, (_, i) => ({ exerciseName: `Ex ${i}`, sets: 1, reps: 5 }));
    expect(() => workout.templates.create(adminId, { name: "Many", exercises: many })).toThrow(
      "workout.tooManyTemplateExercises",
    );

    const existing = workout.templates.create(adminId, {
      name: "Edit",
      exercises: [{ exerciseName: "Row", sets: 3, reps: 5 }],
    })!;
    expect(() =>
      workout.templates.update(existing.templateId, adminId, {
        exercises: [{ exerciseName: "Row", sets: 51, reps: 5 }],
      }),
    ).toThrow("workout.tooManySets");
    expect(workout.templates.get(existing.templateId, adminId)!.exercises[0].defaultSets).toBe(3);

    const cookie = await login("admin");
    const res = await call(cookie, "POST", "/api/workouts/templates", {
      name: "Huge",
      exercises: [{ exerciseName: "Squat", sets: 100000, reps: 5 }],
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "workout.tooManySets", exerciseName: "Squat", max: 50 });
  });

  it("DATA-08: caps sets per session exercise and exercises per session", async () => {
    const s = workout.sessions.create(adminId, undefined, true)!;
    const sets = (n: number) => Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, reps: 5 }));
    expect(() =>
      workout.sessions.update(s.sessionId, adminId, {
        exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(51) }],
      }),
    ).toThrow("workout.tooManySets");
    expect(
      workout.sessions.update(s.sessionId, adminId, {
        exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(50) }],
      })!.exercises[0].sets.length,
    ).toBe(50);
    const many = Array.from({ length: 101 }, (_, i) => ({ exerciseName: `Ex ${i}`, sortOrder: i }));
    expect(() => workout.sessions.update(s.sessionId, adminId, { exercises: many })).toThrow(
      "workout.tooManySessionExercises",
    );
    expect(workout.sessions.get(s.sessionId, adminId)!.exercises.length).toBe(1);

    const cookie = await login("admin");
    const res = await call(cookie, "PATCH", `/api/workouts/sessions/${s.sessionId}`, {
      exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(1000) }],
    });
    expect(res.status).toBe(400);
  });

  it("DATA-09: reorderTemplates is atomic and rejects malformed orders", () => {
    const a = workout.templates.create(adminId, { name: "A" })!;
    const b = workout.templates.create(adminId, { name: "B" })!;
    const ids = workout.templates.list(adminId).map((t) => t.templateId);
    const before = workout.templates.list(adminId).map((t) => t.templateId);

    expect(() =>
      workout.templates.reorder(
        adminId,
        ids.map(() => a.templateId),
      ),
    ).toThrow("workout.templateOrderInvalid");
    expect(() => workout.templates.reorder(adminId, "nope" as unknown as number[])).toThrow(
      "workout.templateOrderInvalid",
    );
    expect(workout.templates.list(adminId).map((t) => t.templateId)).toEqual(before);

    const reversed = [...ids].reverse();
    expect(workout.templates.reorder(adminId, reversed).map((t) => t.templateId)).toEqual(reversed);

    workout.templates.reorder(adminId, ids);
    expect(workout.templates.list(adminId).map((t) => t.templateId)).toEqual(ids);
    expect(ids).toContain(b.templateId);
  });

  it("SEC-01 over HTTP: cross-user exercise update returns 400 and leaves data intact", async () => {
    const adminCookie = await login("admin");
    const testerCookie = await login("tester");
    const victim = (await (await call(testerCookie, "POST", "/api/workouts/sessions", { force: true })).json()) as {
      sessionId: number;
    };
    const withEx = (await (
      await call(testerCookie, "PATCH", `/api/workouts/sessions/${victim.sessionId}`, {
        exercises: [{ exerciseName: "Mine", sortOrder: 0, sets: [{ setNumber: 1, reps: 3, completed: 1 }] }],
      })
    ).json()) as { exercises: { sessionExerciseId: number }[] };
    const exId = withEx.exercises[0].sessionExerciseId;

    const mine = (await (await call(adminCookie, "POST", "/api/workouts/sessions", { force: true })).json()) as {
      sessionId: number;
    };
    const res = await call(adminCookie, "PATCH", `/api/workouts/sessions/${mine.sessionId}`, {
      exercises: [{ sessionExerciseId: exId, exerciseName: "Stolen", sortOrder: 0, sets: [] }],
    });
    expect(res.status).toBe(400);
    const row = db.select().from(sessionExercises).where(eq(sessionExercises.sessionExerciseId, exId)).get();
    expect(row?.exerciseName).toBe("Mine");
    expect(db.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, exId)).all().length).toBe(1);
  });
});
