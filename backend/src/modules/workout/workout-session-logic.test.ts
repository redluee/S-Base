import { describe, expect, it, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import { setupTestDb } from "../../test-utils";
import { app } from "../../index";
import { WorkoutService } from "./index";
import { MeasurementService } from "../measurements";
import db from "../../db/client";
import { workoutSessions, workoutTemplates, measurements } from "../../db/schema";

async function login(username: string) {
  const res = await app.handle(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: username }),
  }));
  const match = res.headers.get("set-cookie")?.match(/session_id=([^;]+)/);
  return `session_id=${match![1]}`;
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    headers: { Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
}

function finishedSession(workout: WorkoutService, userId: number, exercises: any[], durationSeconds = 600) {
  const s = workout.createSession(userId, undefined, true)!;
  workout.updateSession(s.sessionId, userId, { exercises });
  const startedAt = new Date(Date.now() - 3600 * 1000).toISOString();
  db.update(workoutSessions).set({ startedAt }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
  workout.completeSession(s.sessionId, userId, new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString());
  return s.sessionId;
}

describe("workout session, metric and exercise logic", () => {
  let workout: WorkoutService;
  let measurementService: MeasurementService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    db.delete(workoutSessions).where(eq(workoutSessions.userId, adminId)).run();
    db.delete(workoutTemplates).where(eq(workoutTemplates.userId, adminId)).run();
    db.delete(measurements).where(eq(measurements.userId, adminId)).run();
    workout = new WorkoutService();
    measurementService = new MeasurementService();
  });

  describe("BIZ-01 template defaults follow the exercise, not the position", () => {
    it("keeps rest timers and flags attached to the exercise after a swap", () => {
      const template = workout.createTemplate(adminId, {
        name: "Swap",
        exercises: [
          { exerciseName: "Alpha", sets: 2, reps: 5, defaultRestTime: 30 },
          { exerciseName: "Beta", sets: 2, reps: 5, defaultRestTime: 120, isAssisted: 1, weight: -10 },
        ],
      })!;
      const s = workout.createSession(adminId, template.templateId)!;
      const [alpha, beta] = s.exercises;
      const swapped = workout.updateSession(s.sessionId, adminId, {
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
      const template = workout.createTemplate(adminId, {
        name: "Dupes",
        exercises: [
          { exerciseName: "Curl", sets: 1, reps: 5, defaultRestTime: 40 },
          { exerciseName: "Curl", sets: 1, reps: 5, defaultRestTime: 80 },
        ],
      })!;
      const s = workout.createSession(adminId, template.templateId)!;
      const upper = workout.updateSession(s.sessionId, adminId, {
        exercises: s.exercises.map((e) => ({ sessionExerciseId: e.sessionExerciseId, exerciseName: e.exerciseName.toUpperCase(), sortOrder: e.sortOrder })),
      })!;
      expect(upper.exercises.map((e) => e.templateExercise?.defaultRestTime)).toEqual([40, 80]);
    });

    it("persists a custom session rest time and copies the template rest time on start", () => {
      const template = workout.createTemplate(adminId, {
        name: "Rest",
        exercises: [{ exerciseName: "Press", sets: 1, reps: 5, defaultRestTime: 75 }],
      })!;
      const s = workout.createSession(adminId, template.templateId)!;
      expect(s.exercises[0].restTime).toBe(75);

      const updated = workout.updateSession(s.sessionId, adminId, {
        exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0, restTime: 20 }],
      })!;
      expect(updated.exercises[0].restTime).toBe(20);
      expect(updated.exercises[0].templateExercise?.defaultRestTime).toBe(75);

      const untouched = workout.updateSession(s.sessionId, adminId, {
        exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0 }],
      })!;
      expect(untouched.exercises[0].restTime).toBe(20);

      const added = workout.updateSession(s.sessionId, adminId, {
        exercises: [
          { sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0 },
          { exerciseName: "Fly", sortOrder: 1, restTime: 45 },
        ],
      })!;
      expect(added.exercises[1].restTime).toBe(45);
      expect(() =>
        workout.updateSession(s.sessionId, adminId, {
          exercises: [{ sessionExerciseId: s.exercises[0].sessionExerciseId, exerciseName: "Press", sortOrder: 0, restTime: -1 }],
        })
      ).toThrow("Rest time cannot be negative");
    });
  });

  describe("DATA-04 / BIZ-11 starting a session while another is running", () => {
    it("returns 409 with the running session and never deletes it", async () => {
      const cookie = await login("admin");
      const first = await (await call(cookie, "POST", "/api/workouts/sessions", {})).json() as any;
      workout.updateSession(first.sessionId, adminId, {
        exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 0 }] }],
      });

      const res = await call(cookie, "POST", "/api/workouts/sessions", {});
      expect(res.status).toBe(409);
      const body = await res.json() as any;
      expect(body.activeSession.sessionId).toBe(first.sessionId);
      expect(body.activeSession.exerciseCount).toBe(1);
      expect(workout.getSession(first.sessionId, adminId)).not.toBeNull();
      expect(workout.listSessions(adminId, "active").length).toBe(1);
    });

    it("allows an explicit second session with force and does not duplicate otherwise", async () => {
      const cookie = await login("admin");
      const first = await (await call(cookie, "POST", "/api/workouts/sessions", {})).json() as any;
      const forced = await call(cookie, "POST", "/api/workouts/sessions", { force: true });
      expect(forced.status).toBe(200);
      const second = await forced.json() as any;
      expect(second.sessionId).not.toBe(first.sessionId);
      expect(workout.listSessions(adminId, "active").length).toBe(2);
    });

    it("only cleans up stale empty sessions on start", () => {
      const stale = db.insert(workoutSessions).values({
        userId: adminId,
        name: "Stale",
        startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      }).returning().get();
      const fresh = workout.createSession(adminId)!;
      expect(workout.getSession(stale.sessionId, adminId)).toBeNull();
      expect(workout.getSession(fresh.sessionId, adminId)).not.toBeNull();
      expect(() => workout.createSession(adminId)).toThrow("already running");
    });

    it("does not delete a recent empty running session when a new one is requested", () => {
      const running = workout.createSession(adminId)!;
      expect(() => workout.createSession(adminId)).toThrow();
      expect(workout.getSession(running.sessionId, adminId)).not.toBeNull();
    });
  });

  describe("BIZ-05 pause is persisted on the server", () => {
    it("excludes paused time from the duration used for PRs", () => {
      const s = workout.createSession(adminId)!;
      const now = Date.now();
      db.update(workoutSessions).set({ startedAt: new Date(now - 3600 * 1000).toISOString() }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      workout.updateSession(s.sessionId, adminId, {
        exercises: [{ exerciseName: "Row", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 10, completed: 1 }] }],
        pausedSeconds: 1800,
      });
      finishedSession(workout, adminId, [{ exerciseName: "Other", sortOrder: 0, sets: [{ setNumber: 1, reps: 1, completed: 1 }] }], 600);

      const withPause = workout.getSessionPRs(s.sessionId, adminId).find((p) => p.type === "session_duration");
      expect(withPause).toBeDefined();
      expect(withPause!.newValue).toBeGreaterThan(1790);
      expect(withPause!.newValue).toBeLessThan(1810);
    });

    it("counts a running pause as paused and stores it in the session", () => {
      const s = workout.createSession(adminId)!;
      const pausedAt = new Date().toISOString();
      const paused = workout.updateSession(s.sessionId, adminId, { pausedAt })!;
      expect(paused.pausedAt).toBe(pausedAt);
      const resumed = workout.updateSession(s.sessionId, adminId, { pausedAt: null, pausedSeconds: 42 })!;
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.pausedSeconds).toBe(42);
      expect(() => workout.updateSession(s.sessionId, adminId, { pausedSeconds: -1 })).toThrow("Paused seconds cannot be negative");
      expect(() => workout.updateSession(s.sessionId, adminId, { pausedAt: "nonsense" })).toThrow("Paused at must be a valid date");
    });

    it("completes a paused session without counting the paused time", () => {
      const s = workout.createSession(adminId)!;
      const now = Date.now();
      db.update(workoutSessions).set({ startedAt: new Date(now - 3600 * 1000).toISOString() }).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      workout.updateSession(s.sessionId, adminId, {
        pausedSeconds: 600,
        pausedAt: new Date(now - 1200 * 1000).toISOString(),
      });
      const done = workout.completeSession(s.sessionId, adminId)!;
      const seconds = (new Date(done.completedAt!).getTime() - new Date(done.startedAt).getTime()) / 1000;
      expect(seconds).toBeGreaterThan(1790);
      expect(seconds).toBeLessThan(1810);
      expect(done.pausedAt).toBeNull();
    });
  });

  describe("BIZ-06 template fields can be cleared", () => {
    it("clears description, muscle groups and estimated time", () => {
      const t = workout.createTemplate(adminId, {
        name: "Clear",
        description: "desc",
        targetMuscleGroups: "chest",
        estimatedTime: 45,
        exercises: [{ exerciseName: "Bench", sets: 3, reps: 5, duration: 30 }],
      })!;
      const cleared = workout.updateTemplate(t.templateId, adminId, {
        description: null,
        targetMuscleGroups: "",
        estimatedTime: null,
        exercises: [{ exerciseName: "Bench", sets: 3, reps: 5 }],
      })!;
      expect(cleared.description).toBeNull();
      expect(cleared.targetMuscleGroups).toBeNull();
      expect(cleared.estimatedTime).toBeNull();
      expect(cleared.exercises[0].defaultDuration).toBeNull();

      const untouched = workout.updateTemplate(t.templateId, adminId, { name: "Clear 2" })!;
      expect(untouched.description).toBeNull();
    });

    it("keeps values that are not part of the update", () => {
      const t = workout.createTemplate(adminId, { name: "Keep", description: "desc", targetMuscleGroups: "legs", estimatedTime: 30 })!;
      const updated = workout.updateTemplate(t.templateId, adminId, { name: "Keep 2" })!;
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
      expect((await res.json() as any).sessions.length).toBe(1);

      const literal = await call(cookie, "GET", `/api/workouts/exercises/${encodeURIComponent("Press 50%25")}/progress`);
      expect(literal.status).toBe(200);
      expect((await literal.json() as any).exerciseName).toBe("Press 50%25");
    });
  });

  describe("BIZ-09 merging does not over-merge", () => {
    function blocks(sessionId: number) {
      return workout.getSession(sessionId, adminId)!.exercises.map((e) => `${e.exerciseName}:${e.sets.length}`);
    }

    it("leaves intentional duplicate target blocks alone", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Row", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Row", sortOrder: 1, sets: [{ setNumber: 1, reps: 8, completed: 1 }, { setNumber: 2, reps: 8, completed: 1 }] },
      ]);
      workout.mergeExercises(adminId, "Unrelated", "Row");
      expect(blocks(id)).toEqual(["Row:1", "Row:2"]);
    });

    it("renames without combining when several blocks are involved", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Bench", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Bench", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
        { exerciseName: "Bench Press", sortOrder: 2, sets: [{ setNumber: 1, reps: 7, completed: 1 }] },
      ]);
      workout.mergeExercises(adminId, "Bench", "Bench Press");
      expect(blocks(id)).toEqual(["Bench Press:1", "Bench Press:1", "Bench Press:1"]);
    });

    it("combines the single source block with the single target block in one session", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Chin", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Chin-up", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
      ]);
      workout.mergeExercises(adminId, "chin", "Chin-up");
      expect(blocks(id)).toEqual(["Chin-up:2"]);
    });

    it("keeps duplicate template rows when more than one exists", () => {
      const t = workout.createTemplate(adminId, {
        name: "T",
        exercises: [
          { exerciseName: "Dip", sets: 3, reps: 5 },
          { exerciseName: "Dip", sets: 2, reps: 8 },
          { exerciseName: "Dips Old", sets: 1, reps: 10 },
        ],
      })!;
      workout.mergeExercises(adminId, "Dips Old", "Dip");
      expect(workout.getTemplate(t.templateId, adminId)!.exercises.map((e) => e.exerciseName)).toEqual(["Dip", "Dip", "Dip"]);
    });
  });

  describe("BIZ-10 volume and PR math", () => {
    it("never produces negative volume for assisted exercises", () => {
      finishedSession(workout, adminId, [
        { exerciseName: "Assisted Dip", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: -30, completed: 1 }] },
        { exerciseName: "Squat", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] },
      ]);
      expect(workout.getStats(adminId).totalVolume).toBe(500);
    });

    it("treats exercise names case-insensitively for PR baselines", () => {
      finishedSession(workout, adminId, [{ exerciseName: "pull-up", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 10, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Pull-up", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 10, completed: 1 }] }]);
      const prs = workout.getSessionPRs(id, adminId).filter((p) => p.exerciseName);
      expect(prs).toEqual([]);

      const better = finishedSession(workout, adminId, [{ exerciseName: "PULL-UP", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 12, completed: 1 }] }]);
      const weightPr = workout.getSessionPRs(better, adminId).find((p) => p.type === "weight");
      expect(weightPr).toMatchObject({ prevValue: 10, newValue: 12, exerciseName: "PULL-UP" });
    });

    it("counts less assistance as a weight PR and more assistance as none", () => {
      const ex = (w: number) => [{ exerciseName: "Assisted Chin", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: w, completed: 1 }] }];
      finishedSession(workout, adminId, ex(-30));
      const less = finishedSession(workout, adminId, ex(-20));
      expect(workout.getSessionPRs(less, adminId).find((p) => p.type === "weight")).toEqual({
        type: "weight", exerciseName: "Assisted Chin", prevValue: 30, newValue: 20, unit: "kg", assisted: true,
      });
      const more = finishedSession(workout, adminId, ex(-40));
      expect(workout.getSessionPRs(more, adminId).find((p) => p.type === "weight")).toBeUndefined();
    });

    it("compares assisted weights by magnitude even when stored positive", () => {
      const ex = (w: number) => [{ exerciseName: "Assisted Dip", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: w, completed: 1 }] }];
      finishedSession(workout, adminId, ex(30));
      const less = finishedSession(workout, adminId, ex(20));
      expect(workout.getSessionPRs(less, adminId).find((p) => p.type === "weight")).toMatchObject({ prevValue: 30, newValue: 20, assisted: true });
      const more = finishedSession(workout, adminId, ex(35));
      expect(workout.getSessionPRs(more, adminId).find((p) => p.type === "weight")).toBeUndefined();
    });

    it("uses the lowest assistance of a session for assisted weight PRs", () => {
      const ex = (weights: number[]) => [{
        exerciseName: "Assisted Pull-up", category: "Bodyweight", isAssisted: 1, sortOrder: 0,
        sets: weights.map((weight, i) => ({ setNumber: i + 1, reps: 8, weight, completed: 1 })),
      }];
      finishedSession(workout, adminId, ex([-40, -25]));
      const same = finishedSession(workout, adminId, ex([-30, -25]));
      expect(workout.getSessionPRs(same, adminId).find((p) => p.type === "weight")).toBeUndefined();
      const better = finishedSession(workout, adminId, ex([-35, -20]));
      expect(workout.getSessionPRs(better, adminId).find((p) => p.type === "weight")).toMatchObject({ prevValue: 25, newValue: 20, assisted: true });
    });

    it("keeps signed non-assisted reporting when moving from assistance to added weight", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Dip", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: -10, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Dip", sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: 5, completed: 1 }] }]);
      const pr = workout.getSessionPRs(id, adminId).find((p) => p.type === "weight");
      expect(pr).toMatchObject({ prevValue: -10, newValue: 5 });
      expect(pr?.assisted).toBeUndefined();
    });

    it("awards no PRs at all in the very first session", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Deadlift", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 140, completed: 1 }, { setNumber: 2, reps: 5, weight: 140, completed: 1 }] },
        { exerciseName: "Run", category: "Cardio", sortOrder: 1, sets: [{ setNumber: 1, distance: 5, duration: 1500, completed: 1 }] },
      ]);
      expect(workout.getSessionPRs(id, adminId)).toEqual([]);
    });

    it("awards no PR for a first-time assisted exercise", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Assisted Row", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 6, weight: -30, completed: 1 }] },
      ]);
      expect(workout.getSessionPRs(id, adminId)).toEqual([]);
    });

    it("awards session PRs only once a previous session exists", () => {
      const first = finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }], 600);
      expect(workout.getSessionPRs(first, adminId, 900).filter((p) => !p.exerciseName)).toEqual([]);
      const second = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }, { setNumber: 2, reps: 5, weight: 100, completed: 1 }] },
        { exerciseName: "Bench", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 60, completed: 1 }] },
      ], 1200);
      const types = workout.getSessionPRs(second, adminId).filter((p) => !p.exerciseName).map((p) => p.type).sort();
      expect(types).toEqual(["session_duration", "session_exercises", "session_volume"]);
    });

    it("awards no PRs for empty data", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Blank", sortOrder: 0, sets: [{ setNumber: 1, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Blank", sortOrder: 0, sets: [{ setNumber: 1, completed: 1 }, { setNumber: 2, reps: 0, weight: 0, completed: 1 }] },
      ]);
      const prs = workout.getSessionPRs(id, adminId).filter((p) => p.exerciseName === "Blank");
      expect(prs.map((p) => p.type)).toEqual(["sets"]);
    });

    it("awards PRs for repeats but not for an exercise done for the first time", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 110, completed: 1 }] },
        { exerciseName: "Lunge", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 40, completed: 1 }] },
      ]);
      const prs = workout.getSessionPRs(id, adminId);
      expect(prs.filter((p) => p.exerciseName === "Lunge")).toEqual([]);
      expect(prs.filter((p) => p.exerciseName === "Squat").map((p) => p.type).sort()).toEqual(["volume", "weight"]);
    });

    it("does not report a 0 baseline for metrics that were never tracked before", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Run", category: "Cardio", sortOrder: 0, sets: [{ setNumber: 1, duration: 1200, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Run", category: "Cardio", sortOrder: 0, sets: [{ setNumber: 1, duration: 1500, distance: 5, completed: 1 }] }]);
      const prs = workout.getSessionPRs(id, adminId).filter((p) => p.exerciseName === "Run");
      expect(prs.map((p) => p.type)).toEqual(["duration"]);
    });

    it("computes session volume without assisted weight", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] },
        { exerciseName: "Assisted Pull-up", category: "Bodyweight", isAssisted: 1, sortOrder: 1, sets: [{ setNumber: 1, reps: 10, weight: -40, completed: 1 }] },
      ]);
      expect(workout.getSessionPRs(id, adminId).find((p) => p.type === "session_volume")).toBeUndefined();
    });

    it("rejects an invalid duration query value gracefully", async () => {
      const cookie = await login("admin");
      const id = finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }]);
      const res = await call(cookie, "GET", `/api/workouts/sessions/${id}/prs?duration=abc`);
      expect(res.status).toBe(200);
    });
  });

  describe("unknown session exercises from offline replay", () => {
    it("returns 400 with a machine readable code and the offending id", async () => {
      const cookie = await login("admin");
      const s = workout.createSession(adminId, undefined, true)!;
      const res = await call(cookie, "PATCH", `/api/workouts/sessions/${s.sessionId}`, {
        exercises: [{ sessionExerciseId: 987654, exerciseName: "Ghost", sortOrder: 0, sets: [] }],
      });
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.code).toBe("unknown_session_exercise");
      expect(body.sessionExerciseId).toBe(987654);
      expect(body.error).toBe("Exercise does not belong to this session");
    });
  });

  describe("set validation over HTTP", () => {
    it("returns 400 for invalid set parameters so sync can reject immediately", async () => {
      const cookie = await login("admin");
      const s = workout.createSession(adminId, undefined, true)!;
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

  describe("BIZ-12 measurements", () => {
    it("moves a measurement to a new date instead of duplicating it", () => {
      const created = measurementService.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const moved = measurementService.update(adminId, created.measurementId, { date: "2026-03-05", weight: 79 })!;
      expect(moved.measurementId).toBe(created.measurementId);
      expect(moved.date).toBe("2026-03-05");
      expect(moved.weight).toBe(79);
      expect(measurementService.list(adminId).length).toBe(1);
    });

    it("clears fields explicitly with null and keeps untouched ones", () => {
      const created = measurementService.save(adminId, { date: "2026-03-01", weight: 80, bodyFat: 15 })!;
      const updated = measurementService.update(adminId, created.measurementId, { bodyFat: null })!;
      expect(updated.bodyFat).toBeNull();
      expect(updated.weight).toBe(80);
      expect(updated.date).toBe("2026-03-01");
    });

    it("rejects moving onto a date that already has a measurement", async () => {
      const a = measurementService.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const b = measurementService.save(adminId, { date: "2026-03-02", weight: 81 })!;
      expect(() => measurementService.update(adminId, a.measurementId, { date: "2026-03-02" })).toThrow("already exists");

      const cookie = await login("admin");
      const res = await call(cookie, "PUT", `/api/measurements/${a.measurementId}`, { date: "2026-03-02" });
      expect(res.status).toBe(409);
      expect((await res.json() as any).existingMeasurementId).toBe(b.measurementId);
      expect(measurementService.list(adminId).length).toBe(2);
    });

    it("validates ids, dates and values", async () => {
      const cookie = await login("admin");
      const m = measurementService.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const checks: [string, string, unknown, number][] = [
        ["PUT", "/api/measurements/abc", { weight: 1 }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { date: "2026-02-31" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { date: "yesterday" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { weight: "80" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { weight: -2 }, 400],
        ["PUT", "/api/measurements/999999", { weight: 1 }, 404],
        ["POST", "/api/measurements", { date: "2026-02-30", weight: 1 }, 400],
        ["POST", "/api/measurements", { date: "2026-03-01", weight: "heavy" }, 400],
        ["DELETE", "/api/measurements/abc", undefined, 400],
        ["DELETE", "/api/measurements/photos/abc", undefined, 400],
        ["POST", "/api/measurements/abc/photos", { filePath: "x" }, 400],
      ];
      for (const [method, path, body, status] of checks) {
        const res = await call(cookie, method, path, body);
        expect([method, path, JSON.stringify(body), res.status]).toEqual([method, path, JSON.stringify(body), status]);
      }
    });

    it("does not let another user edit a measurement", () => {
      const m = measurementService.save(adminId, { date: "2026-03-01", weight: 80 })!;
      expect(measurementService.update(adminId + 100, m.measurementId, { weight: 1 })).toBeNull();
    });
  });
});
