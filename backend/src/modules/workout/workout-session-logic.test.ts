import { describe, expect, it, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import { setupTestDb } from "../../test-utils";
import { WorkoutService } from "./index";
import { call, finishedSession, login } from "./workout-test-utils";
import db from "../../db/client";
import { workoutSessions, workoutTemplates } from "../../db/schema";

describe("workout session, metric and exercise logic", () => {
  let workout: WorkoutService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    db.delete(workoutSessions).where(eq(workoutSessions.userId, adminId)).run();
    db.delete(workoutTemplates).where(eq(workoutTemplates.userId, adminId)).run();
    workout = new WorkoutService();
  });

  describe("BIZ-01 template defaults follow the exercise, not the position", () => {
    it("keeps rest timers and flags attached to the exercise after a swap", () => {
      const template = workout.templates.create(adminId, {
        name: "Swap",
        exercises: [
          { exerciseName: "Alpha", sets: 2, reps: 5, defaultRestTime: 30 },
          { exerciseName: "Beta", sets: 2, reps: 5, defaultRestTime: 120, isAssisted: 1, weight: -10 },
        ],
      })!;
      const s = workout.sessions.create(adminId, template.templateId)!;
      const [alpha, beta] = s.exercises;
      const swapped = workout.sessions.update(s.sessionId, adminId, {
        exercises: [
          { sessionExerciseId: beta.sessionExerciseId, exerciseName: "Beta", sortOrder: 0, isAssisted: 1 },
          { sessionExerciseId: alpha.sessionExerciseId, exerciseName: "Alpha", sortOrder: 1 },
        ],
      })!;
      expect(swapped.exercises.map((e) => e.exerciseName)).toEqual(["Beta", "Alpha"]);
      expect(swapped.exercises[0].templateExercise?.defaultRestTime).toBe(120);
      expect(swapped.exercises[0].templateExercise?.isAssisted).toBe(1);
      expect(swapped.exercises[1].templateExercise?.defaultRestTime).toBe(30);
      expect(swapped.exercises[1].templateExercise?.isAssisted).toBe(0);
    });

    it("matches template exercises case-insensitively and by occurrence for duplicates", () => {
      const template = workout.templates.create(adminId, {
        name: "Dupes",
        exercises: [
          { exerciseName: "Curl", sets: 1, reps: 5, defaultRestTime: 40 },
          { exerciseName: "Curl", sets: 1, reps: 5, defaultRestTime: 80 },
        ],
      })!;
      const s = workout.sessions.create(adminId, template.templateId)!;
      const upper = workout.sessions.update(s.sessionId, adminId, {
        exercises: s.exercises.map((e) => ({ sessionExerciseId: e.sessionExerciseId, exerciseName: e.exerciseName.toUpperCase(), sortOrder: e.sortOrder })),
      })!;
      expect(upper.exercises.map((e) => e.templateExercise?.defaultRestTime)).toEqual([40, 80]);
    });

    it("persists a custom session rest time and copies the template rest time on start", () => {
      const template = workout.templates.create(adminId, {
        name: "Rest",
        exercises: [{ exerciseName: "Press", sets: 1, reps: 5, defaultRestTime: 75 }],
      })!;
      const s = workout.sessions.create(adminId, template.templateId)!;
      expect(s.exercises[0].restTime).toBe(75);

      const updated = workout.sessions.update(s.sessionId, adminId, {
        exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0, restTime: 20 }],
      })!;
      expect(updated.exercises[0].restTime).toBe(20);
      expect(updated.exercises[0].templateExercise?.defaultRestTime).toBe(75);

      const untouched = workout.sessions.update(s.sessionId, adminId, {
        exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0 }],
      })!;
      expect(untouched.exercises[0].restTime).toBe(20);

      const added = workout.sessions.update(s.sessionId, adminId, {
        exercises: [
          { sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0 },
          { exerciseName: "Fly", sortOrder: 1, restTime: 45 },
        ],
      })!;
      expect(added.exercises[1].restTime).toBe(45);
      expect(() =>
        workout.sessions.update(s.sessionId, adminId, {
          exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0, restTime: -1 }],
        })
      ).toThrow("workout.restTimeNegative");
    });
  });

  describe("DATA-04 / BIZ-11 starting a session while another is running", () => {
    it("returns 409 with the running session and never deletes it", async () => {
      const cookie = await login("admin");
      const first = await (await call(cookie, "POST", "/api/workouts/sessions", {})).json() as { sessionId: number };
      workout.sessions.update(first.sessionId, adminId, {
        exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 0 }] }],
      });

      const res = await call(cookie, "POST", "/api/workouts/sessions", {});
      expect(res.status).toBe(409);
      const body = await res.json() as { activeSession: { sessionId: number; exerciseCount: number } };
      expect(body.activeSession.sessionId).toBe(first.sessionId);
      expect(body.activeSession.exerciseCount).toBe(1);
      expect(workout.sessions.get(first.sessionId, adminId)).not.toBeNull();
      expect(workout.sessions.list(adminId, "active").length).toBe(1);
    });

    it("allows an explicit second session with force and does not duplicate otherwise", async () => {
      const cookie = await login("admin");
      const first = await (await call(cookie, "POST", "/api/workouts/sessions", {})).json() as { sessionId: number };
      const forced = await call(cookie, "POST", "/api/workouts/sessions", { force: true });
      expect(forced.status).toBe(200);
      const second = await forced.json() as { sessionId: number };
      expect(second.sessionId).not.toBe(first.sessionId);
      expect(workout.sessions.list(adminId, "active").length).toBe(2);
    });

    it("only cleans up stale empty sessions on start", () => {
      const stale = db.insert(workoutSessions).values({
        userId: adminId,
        name: "Stale",
        startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      }).returning().get();
      const fresh = workout.sessions.create(adminId)!;
      expect(() => workout.sessions.get(stale.sessionId, adminId)).toThrow("workout.sessionNotFound");
      expect(workout.sessions.get(fresh.sessionId, adminId)).not.toBeNull();
      expect(() => workout.sessions.create(adminId)).toThrow("workout.activeSessionExists");
    });

    it("does not delete a recent empty running session when a new one is requested", () => {
      const running = workout.sessions.create(adminId)!;
      expect(() => workout.sessions.create(adminId)).toThrow();
      expect(workout.sessions.get(running.sessionId, adminId)).not.toBeNull();
    });
  });

  describe("BIZ-05 pause is persisted on the server", () => {
    it("excludes paused time from the duration used for PRs", () => {
      const s = workout.sessions.create(adminId)!;
      const now = Date.now();
      db.update(workoutSessions).set({ startedAt: new Date(now - 3600 * 1000).toISOString() }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      workout.sessions.update(s.sessionId, adminId, {
        exercises: [{ exerciseName: "Row", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 10, completed: 1 }] }],
        pausedSeconds: 1800,
      });
      finishedSession(workout, adminId, [{ exerciseName: "Other", sortOrder: 0, sets: [{ setNumber: 1, reps: 1, completed: 1 }] }], 600);

      const withPause = workout.stats.sessionPRs(s.sessionId, adminId).find((p) => p.type === "session_duration");
      expect(withPause).toBeDefined();
      expect(withPause!.newValue).toBeGreaterThan(1790);
      expect(withPause!.newValue).toBeLessThan(1810);
    });

    it("counts a running pause as paused and stores it in the session", () => {
      const s = workout.sessions.create(adminId)!;
      const pausedAt = new Date().toISOString();
      const paused = workout.sessions.update(s.sessionId, adminId, { pausedAt })!;
      expect(paused.pausedAt).toBe(pausedAt);
      const resumed = workout.sessions.update(s.sessionId, adminId, { pausedAt: null, pausedSeconds: 42 })!;
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.pausedSeconds).toBe(42);
      expect(() => workout.sessions.update(s.sessionId, adminId, { pausedSeconds: -1 })).toThrow("workout.pausedSecondsNegative");
      expect(() => workout.sessions.update(s.sessionId, adminId, { pausedAt: "nonsense" })).toThrow("workout.invalidDate");
    });

    it("completes a paused session without counting the paused time", () => {
      const s = workout.sessions.create(adminId)!;
      const now = Date.now();
      db.update(workoutSessions).set({ startedAt: new Date(now - 3600 * 1000).toISOString() }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      workout.sessions.update(s.sessionId, adminId, {
        pausedSeconds: 600,
        pausedAt: new Date(now - 1200 * 1000).toISOString(),
      });
      const done = workout.sessions.complete(s.sessionId, adminId)!;
      const seconds = (new Date(done.completedAt!).getTime() - new Date(done.startedAt).getTime()) / 1000;
      expect(seconds).toBeGreaterThan(1790);
      expect(seconds).toBeLessThan(1810);
      expect(done.pausedAt).toBeNull();
    });
  });

  describe("BIZ-06 template fields can be cleared", () => {
    it("clears description, muscle groups and estimated time", () => {
      const t = workout.templates.create(adminId, {
        name: "Clear",
        description: "desc",
        targetMuscleGroups: "chest",
        estimatedTime: 45,
        exercises: [{ exerciseName: "Bench", sets: 3, reps: 5, duration: 30 }],
      })!;
      const cleared = workout.templates.update(t.templateId, adminId, {
        description: null,
        targetMuscleGroups: "",
        estimatedTime: null,
        exercises: [{ exerciseName: "Bench", sets: 3, reps: 5 }],
      })!;
      expect(cleared.description).toBeNull();
      expect(cleared.targetMuscleGroups).toBeNull();
      expect(cleared.estimatedTime).toBeNull();
      expect(cleared.exercises[0].defaultDuration).toBeNull();

      const untouched = workout.templates.update(t.templateId, adminId, { name: "Clear 2" })!;
      expect(untouched.description).toBeNull();
    });

    it("keeps values that are not part of the update", () => {
      const t = workout.templates.create(adminId, { name: "Keep", description: "desc", targetMuscleGroups: "legs", estimatedTime: 30 })!;
      const updated = workout.templates.update(t.templateId, adminId, { name: "Keep 2" })!;
      expect(updated.description).toBe("desc");
      expect(updated.targetMuscleGroups).toBe("legs");
      expect(updated.estimatedTime).toBe(30);
    });
  });

  describe("BIZ-08 exercise names containing percent signs", () => {
    it("serves progress for names with percent signs without a server error", async () => {
      const cookie = await login("admin");
      finishedSession(workout, adminId, [{ exerciseName: "100% Effort", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }]);
      finishedSession(workout, adminId, [{ exerciseName: "Press 50%25", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }]);

      const res = await call(cookie, "GET", `/api/workouts/exercises/${encodeURIComponent("100% Effort")}/progress`);
      expect(res.status).toBe(200);
      expect((await res.json() as { sessions: unknown[] }).sessions.length).toBe(1);

      const literal = await call(cookie, "GET", `/api/workouts/exercises/${encodeURIComponent("Press 50%25")}/progress`);
      expect(literal.status).toBe(200);
      expect((await literal.json() as { exerciseName: string }).exerciseName).toBe("Press 50%25");
    });
  });

  describe("BIZ-09 merging does not over-merge", () => {
    function blocks(sessionId: number) {
      return workout.sessions.get(sessionId, adminId)!.exercises.map((e) => `${e.exerciseName}:${e.sets.length}`);
    }

    it("leaves intentional duplicate target blocks alone", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Row", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Row", sortOrder: 1, sets: [{ setNumber: 1, reps: 8, completed: 1 }, { setNumber: 2, reps: 8, completed: 1 }] },
      ]);
      workout.exercises.merge(adminId, "Unrelated", "Row");
      expect(blocks(id)).toEqual(["Row:1", "Row:2"]);
    });

    it("renames without combining when several blocks are involved", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Bench", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Bench", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
        { exerciseName: "Bench Press", sortOrder: 2, sets: [{ setNumber: 1, reps: 7, completed: 1 }] },
      ]);
      workout.exercises.merge(adminId, "Bench", "Bench Press");
      expect(blocks(id)).toEqual(["Bench Press:1", "Bench Press:1", "Bench Press:1"]);
    });

    it("combines the single source block with the single target block in one session", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Chin", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Chin-up", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
      ]);
      workout.exercises.merge(adminId, "chin", "Chin-up");
      expect(blocks(id)).toEqual(["Chin-up:2"]);
    });

    it("keeps duplicate template rows when more than one exists", () => {
      const t = workout.templates.create(adminId, {
        name: "T",
        exercises: [
          { exerciseName: "Dip", sets: 3, reps: 5 },
          { exerciseName: "Dip", sets: 2, reps: 8 },
          { exerciseName: "Dips Old", sets: 1, reps: 10 },
        ],
      })!;
      workout.exercises.merge(adminId, "Dips Old", "Dip");
      expect(workout.templates.get(t.templateId, adminId)!.exercises.map((e) => e.exerciseName)).toEqual(["Dip", "Dip", "Dip"]);
    });
  });

  describe("unknown session exercises from offline replay", () => {
    it("returns 400 with a machine readable key and the offending id", async () => {
      const cookie = await login("admin");
      const s = workout.sessions.create(adminId, undefined, true)!;
      const res = await call(cookie, "PATCH", `/api/workouts/sessions/${s.sessionId}`, {
        exercises: [{ sessionExerciseId: 987654, exerciseName: "Ghost", sortOrder: 0, sets: [] }],
      });
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string; sessionExerciseId: number };
      expect(body.error).toBe("workout.exerciseNotInSession");
      expect(body.sessionExerciseId).toBe(987654);
    });
  });

  describe("set validation over HTTP", () => {
    it("returns 400 for invalid set parameters so sync can reject immediately", async () => {
      const cookie = await login("admin");
      const s = workout.sessions.create(adminId, undefined, true)!;
      const bodies = [
        { exercises: [{ exerciseName: "A", sortOrder: 0, sets: [{ setNumber: 1, reps: -1, completed: 0 }] }] },
        { exercises: [{ exerciseName: "A", sortOrder: 0, sets: [{ setNumber: 1, rpe: 11, completed: 0 }] }] },
        { exercises: [{ exerciseName: "A", sortOrder: 0, sets: [{ setNumber: 1, weight: -5, completed: 0 }] }] },
        { exercises: [{ exerciseName: "A", sortOrder: 0, sets: [{ setNumber: 1, reps: "5", completed: 0 }] }] },
      ];
      for (const body of bodies) {
        const res = await call(cookie, "PATCH", `/api/workouts/sessions/${s.sessionId}`, body);
        expect([JSON.stringify(body), res.status]).toEqual([JSON.stringify(body), 400]);
      }
    });
  });
});
