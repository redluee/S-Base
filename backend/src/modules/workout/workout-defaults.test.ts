import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { WorkoutService } from "./index";

let workout: WorkoutService;
let userId: number;
let otherUserId: number;
let exerciseName: string;
let count = 0;

beforeEach(async () => {
  const ids = await setupTestDb();
  userId = ids.adminId;
  otherUserId = ids.testerId;
  workout = new WorkoutService();
  exerciseName = `Default exercise ${++count}`;
});

function history(weights: number[], owner = userId, completed = true) {
  const session = workout.createSession(owner, undefined, true)!;
  workout.updateSession(session.sessionId, owner, {
    exercises: [{
      exerciseName,
      sortOrder: 0,
      sets: weights.map((weight, i) => ({ setNumber: i + 1, weight, reps: 8, completed: 1 })),
    }],
  });
  if (completed) workout.completeSession(session.sessionId, owner);
  return session;
}

function start(weight: number | null = 20) {
  const template = workout.createTemplate(userId, {
    name: "Default test",
    exercises: [{ exerciseName, sets: 3, reps: 10, weight }],
  })!;
  return workout.createSession(userId, template.templateId, true)!;
}

describe("workout system defaults", () => {
  it("uses the highest executed weight from the latest session across templates", () => {
    history([100]);
    history([30, 50, 40]);
    history([200], otherUserId);
    history([300], userId, false);
    const current = start();
    expect(current.exercises[0].sets.map((set) => set.weight)).toEqual([50, 50, 50]);
    expect(current.exercises[0].sets.every((set) => set.editedFields === "")).toBe(true);
    expect(workout.suggestExercises(userId, exerciseName)[0].defaultWeight).toBe(50);
  });

  it("ignores uncompleted sets and falls back to the template without history", () => {
    const past = history([35]);
    workout.updateSession(past.sessionId, userId, {
      exercises: [{ exerciseName, sortOrder: 0, sets: [
        { setNumber: 1, reps: 8, weight: 35, completed: 1 },
        { setNumber: 2, reps: 8, weight: 500, completed: 0 },
      ] }],
    });
    expect(start().exercises[0].sets.map((set) => set.weight)).toEqual([35, 35, 35]);
    exerciseName += " new";
    expect(start(25).exercises[0].sets.map((set) => set.weight)).toEqual([25, 25, 25]);
  });

  it("keeps zero weight and does not revive template weight when history is unweighted", () => {
    history([0]);
    expect(start().exercises[0].sets[0].weight).toBe(0);
    exerciseName += " unweighted";
    const past = history([0]);
    workout.updateSession(past.sessionId, userId, {
      exercises: [{ exerciseName, sortOrder: 0, sets: [{ setNumber: 1, reps: 8, completed: 1 }] }],
    });
    expect(start().exercises[0].sets[0].weight).toBeNull();
  });

  it("retains field provenance across save and reload", () => {
    const session = start();
    const exercises = session.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((set, i) => ({ ...set, editedFields: i === 0 ? "weight" : "" })),
    }));
    workout.updateSession(session.sessionId, userId, { exercises });
    expect(workout.getSession(session.sessionId, userId)!.exercises[0].sets.map((set) => set.editedFields))
      .toEqual(["weight", "", ""]);
  });
});
