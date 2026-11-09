import { describe, expect, it, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import { setupTestDb } from "../../test-utils";
import { WorkoutService } from "./index";
import db from "../../db/client";
import { workoutSessions, workoutTemplates } from "../../db/schema";
import { call, finishedSession, login } from "./workout-test-utils";

describe("workout volume and PR math", () => {
  let workout: WorkoutService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    db.delete(workoutSessions).where(eq(workoutSessions.userId, adminId)).run();
    db.delete(workoutTemplates).where(eq(workoutTemplates.userId, adminId)).run();
    workout = new WorkoutService();
  });

  describe("BIZ-10 volume and PR math", () => {
    it("never produces negative volume for assisted exercises", () => {
      finishedSession(workout, adminId, [
        { exerciseName: "Assisted Dip", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: -30, completed: 1 }] },
        { exerciseName: "Squat", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] },
      ]);
      expect(workout.stats.summary(adminId).totalVolume).toBe(500);
    });

    it("treats exercise names case-insensitively for PR baselines", () => {
      finishedSession(workout, adminId, [{ exerciseName: "pull-up", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 10, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Pull-up", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 10, completed: 1 }] }]);
      const prs = workout.stats.sessionPRs(id, adminId).filter((p) => p.exerciseName);
      expect(prs).toEqual([]);

      const better = finishedSession(workout, adminId, [{ exerciseName: "PULL-UP", sortOrder: 0, sets: [{ setNumber: 1, reps: 10, weight: 12, completed: 1 }] }]);
      const weightPr = workout.stats.sessionPRs(better, adminId).find((p) => p.type === "weight");
      expect(weightPr).toMatchObject({ prevValue: 10, newValue: 12, exerciseName: "PULL-UP" });
    });

    it("counts less assistance as a weight PR and more assistance as none", () => {
      const ex = (w: number) => [{ exerciseName: "Assisted Chin", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: w, completed: 1 }] }];
      finishedSession(workout, adminId, ex(-30));
      const less = finishedSession(workout, adminId, ex(-20));
      expect(workout.stats.sessionPRs(less, adminId).find((p) => p.type === "weight")).toEqual({
        type: "weight", exerciseName: "Assisted Chin", prevValue: 30, newValue: 20, unit: "kg", assisted: true,
      });
      const more = finishedSession(workout, adminId, ex(-40));
      expect(workout.stats.sessionPRs(more, adminId).find((p) => p.type === "weight")).toBeUndefined();
    });

    it("compares assisted weights by magnitude even when stored positive", () => {
      const ex = (w: number) => [{ exerciseName: "Assisted Dip", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: w, completed: 1 }] }];
      finishedSession(workout, adminId, ex(30));
      const less = finishedSession(workout, adminId, ex(20));
      expect(workout.stats.sessionPRs(less, adminId).find((p) => p.type === "weight")).toMatchObject({ prevValue: 30, newValue: 20, assisted: true });
      const more = finishedSession(workout, adminId, ex(35));
      expect(workout.stats.sessionPRs(more, adminId).find((p) => p.type === "weight")).toBeUndefined();
    });

    it("uses the lowest assistance of a session for assisted weight PRs", () => {
      const ex = (weights: number[]) => [{
        exerciseName: "Assisted Pull-up", category: "Bodyweight", isAssisted: 1, sortOrder: 0,
        sets: weights.map((weight, i) => ({ setNumber: i + 1, reps: 8, weight, completed: 1 })),
      }];
      finishedSession(workout, adminId, ex([-40, -25]));
      const same = finishedSession(workout, adminId, ex([-30, -25]));
      expect(workout.stats.sessionPRs(same, adminId).find((p) => p.type === "weight")).toBeUndefined();
      const better = finishedSession(workout, adminId, ex([-35, -20]));
      expect(workout.stats.sessionPRs(better, adminId).find((p) => p.type === "weight")).toMatchObject({ prevValue: 25, newValue: 20, assisted: true });
    });

    it("keeps signed non-assisted reporting when moving from assistance to added weight", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Dip", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: -10, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Dip", sortOrder: 0, sets: [{ setNumber: 1, reps: 8, weight: 5, completed: 1 }] }]);
      const pr = workout.stats.sessionPRs(id, adminId).find((p) => p.type === "weight");
      expect(pr).toMatchObject({ prevValue: -10, newValue: 5 });
      expect(pr?.assisted).toBeUndefined();
    });

    it("awards no PRs at all in the very first session", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Deadlift", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 140, completed: 1 }, { setNumber: 2, reps: 5, weight: 140, completed: 1 }] },
        { exerciseName: "Run", category: "Cardio", sortOrder: 1, sets: [{ setNumber: 1, distance: 5, duration: 1500, completed: 1 }] },
      ]);
      expect(workout.stats.sessionPRs(id, adminId)).toEqual([]);
    });

    it("awards no PR for a first-time assisted exercise", () => {
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Assisted Row", category: "Bodyweight", isAssisted: 1, sortOrder: 0, sets: [{ setNumber: 1, reps: 6, weight: -30, completed: 1 }] },
      ]);
      expect(workout.stats.sessionPRs(id, adminId)).toEqual([]);
    });

    it("awards session PRs only once a previous session exists", () => {
      const first = finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }], 600);
      expect(workout.stats.sessionPRs(first, adminId, 900).filter((p) => !p.exerciseName)).toEqual([]);
      const second = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }, { setNumber: 2, reps: 5, weight: 100, completed: 1 }] },
        { exerciseName: "Bench", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 60, completed: 1 }] },
      ], 1200);
      const types = workout.stats.sessionPRs(second, adminId).filter((p) => !p.exerciseName).map((p) => p.type).sort();
      expect(types).toEqual(["session_duration", "session_exercises", "session_volume"]);
    });

    it("awards no PRs for empty data", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Blank", sortOrder: 0, sets: [{ setNumber: 1, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Blank", sortOrder: 0, sets: [{ setNumber: 1, completed: 1 }, { setNumber: 2, reps: 0, weight: 0, completed: 1 }] },
      ]);
      const prs = workout.stats.sessionPRs(id, adminId).filter((p) => p.exerciseName === "Blank");
      expect(prs.map((p) => p.type)).toEqual(["sets"]);
    });

    it("awards PRs for repeats but not for an exercise done for the first time", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 110, completed: 1 }] },
        { exerciseName: "Lunge", sortOrder: 1, sets: [{ setNumber: 1, reps: 5, weight: 40, completed: 1 }] },
      ]);
      const prs = workout.stats.sessionPRs(id, adminId);
      expect(prs.filter((p) => p.exerciseName === "Lunge")).toEqual([]);
      expect(prs.filter((p) => p.exerciseName === "Squat").map((p) => p.type).sort()).toEqual(["volume", "weight"]);
    });

    it("does not report a 0 baseline for metrics that were never tracked before", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Run", category: "Cardio", sortOrder: 0, sets: [{ setNumber: 1, duration: 1200, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [{ exerciseName: "Run", category: "Cardio", sortOrder: 0, sets: [{ setNumber: 1, duration: 1500, distance: 5, completed: 1 }] }]);
      const prs = workout.stats.sessionPRs(id, adminId).filter((p) => p.exerciseName === "Run");
      expect(prs.map((p) => p.type)).toEqual(["duration"]);
    });

    it("computes session volume without assisted weight", () => {
      finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }]);
      const id = finishedSession(workout, adminId, [
        { exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] },
        { exerciseName: "Assisted Pull-up", category: "Bodyweight", isAssisted: 1, sortOrder: 1, sets: [{ setNumber: 1, reps: 10, weight: -40, completed: 1 }] },
      ]);
      expect(workout.stats.sessionPRs(id, adminId).find((p) => p.type === "session_volume")).toBeUndefined();
    });

    it("rejects an invalid duration query value gracefully", async () => {
      const cookie = await login("admin");
      const id = finishedSession(workout, adminId, [{ exerciseName: "Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }]);
      const res = await call(cookie, "GET", `/api/workouts/sessions/${id}/prs?duration=abc`);
      expect(res.status).toBe(200);
    });
  });
});
