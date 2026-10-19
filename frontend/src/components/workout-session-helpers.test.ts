import { describe, expect, it } from "bun:test";
import { buildEditDraft, fillCompletedSetDefaults, nextSessionSet, parseDraftValues } from "./workout-session-helpers";
import { buildSessionExercisesPayload } from "@/lib/offline-workout";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

function exercise(timed = false): SessionExercise {
  return {
    exerciseName: "Example exercise",
    sortOrder: 0,
    category: timed ? "isometric" : "bodyweight",
    equipment: "Bodyweight",
    sets: [1, 2].map((setNumber) => ({
      setNumber,
      reps: timed ? null : 10,
      duration: timed ? 30 : null,
      weight: null,
      completed: 0,
    })),
  };
}

describe("nextSessionSet", () => {
  for (const field of ["reps", "duration", "weight", "distance"] as const) {
    it(`keeps disabled ${field} off when adding and completing a set`, () => {
      const ex = exercise();
      ex.category = "resistance";
      ex.sets = ex.sets.map((set) => ({ ...set, reps: 10, duration: 30, weight: 15, distance: 1, [field]: null }));
      const added = nextSessionSet(ex.sets);
      ex.sets.push(added);
      fillCompletedSetDefaults(ex, added, 2, {});
      expect(added[field]).toBeNull();
      expect(added.setNumber).toBe(3);
      expect(added.completed).toBe(0);
    });
  }

  it("copies enabled metrics, including zero, without copying completion or database ids", () => {
    const previous: SessionSet = { setId: 123, setNumber: 1, reps: 0, duration: 30, weight: 0, distance: 0, rpe: 7, heartRate: 120, completed: 1 };
    expect(nextSessionSet([previous])).toEqual({ setNumber: 2, editedFields: "", reps: 0, duration: 30, weight: 0, distance: 0, rpe: 7, heartRate: 120, completed: 0 });
    expect(previous.completed).toBe(1);
  });
});

describe("fillCompletedSetDefaults", () => {
  const trackingFields = [
    ["reps", "reps"],
    ["time", "duration"],
    ["weight", "weight"],
    ["distance", "distance"],
  ] as const;

  for (const category of ["resistance", "bodyweight", "isometric", "cardio"]) {
    for (const [checkbox, field] of trackingFields) {
      it(`keeps disabled ${checkbox} off in ${category} after completion and sync`, () => {
        const ex = exercise();
        ex.category = category;
        ex.sets = ex.sets.map((set) => ({ ...set, reps: 10, duration: 30, weight: 15, distance: 1 }));
        ex.templateExercise = { defaultReps: 12, defaultDuration: 60, defaultWeight: 20, defaultDistance: 2 };
        const draft = buildEditDraft(ex);
        draft.trackingFields[checkbox] = false;
        const values = parseDraftValues(draft);
        ex.sets = ex.sets.map((set) => ({
          ...set,
          reps: values.numReps,
          duration: values.durationSecs,
          weight: values.weightVal,
          distance: values.distVal,
        }));
        const history = { [ex.exerciseName]: [{ setNumber: 1, reps: 12, duration: 60, weight: 20, distance: 2, completed: 1 }] };

        for (const [index, set] of ex.sets.entries()) {
          fillCompletedSetDefaults(ex, set, index, history);
          set.completed = 1;
        }

        expect(ex.sets.map((set) => set[field])).toEqual([null, null]);
        expect(buildEditDraft(ex).trackingFields[checkbox]).toBe(false);
        expect(buildSessionExercisesPayload([ex])?.[0].sets?.map((set) => set[field])).toEqual([null, null]);
      });
    }
  }

  for (const timed of [false, true]) {
    it(`keeps weight disabled for ${timed ? "timed" : "rep"} sets despite history and template defaults`, () => {
      const ex = exercise(timed);
      ex.templateExercise = { defaultWeight: 15 };
      const history: Record<string, SessionSet[]> = {
        [ex.exerciseName]: [{ setNumber: 1, weight: 20, completed: 1 }],
      };

      for (const [index, set] of ex.sets.entries()) {
        set.completed = 1;
        fillCompletedSetDefaults(ex, set, index, history);
      }

      expect(ex.sets.map((set) => set.weight)).toEqual([null, null]);
      expect(buildSessionExercisesPayload([ex])?.[0].sets?.map((set) => set.weight)).toEqual([null, null]);
    });
  }

  it("does not introduce zero weight when completing an unweighted set", () => {
    const ex = exercise();
    ex.category = "resistance";
    fillCompletedSetDefaults(ex, ex.sets[0], 0, {});
    expect(ex.sets[0].weight).toBeNull();
  });

  for (const category of ["resistance", "bodyweight", "isometric", "cardio"]) {
    it(`does not restore reps or time for a distance-only ${category} exercise`, () => {
      const ex = exercise();
      ex.category = category;
      ex.sets = ex.sets.map((set) => ({ ...set, reps: null, duration: null, distance: 1 }));
      ex.templateExercise = { defaultReps: 12, defaultDuration: 60 };
      const history = { [ex.exerciseName]: [{ setNumber: 1, reps: 12, duration: 60, completed: 1 }] };

      fillCompletedSetDefaults(ex, ex.sets[0], 0, history);

      expect(ex.sets[0].reps).toBeNull();
      expect(ex.sets[0].duration).toBeNull();
      expect(ex.sets[0].distance).toBe(1);
    });
  }

  it("still fills missing weight from history when the exercise tracks weight", () => {
    const ex = exercise();
    ex.sets[0].weight = 0;
    fillCompletedSetDefaults(ex, ex.sets[1], 1, {
      [ex.exerciseName]: [{ setNumber: 1, weight: 20, completed: 1 }],
    });
    expect(ex.sets[1].weight).toBe(20);
    expect(ex.sets[0].weight).toBe(0);
  });

  for (const [category, field, defaultField, value] of [
    ["bodyweight", "reps", "defaultReps", 12],
    ["isometric", "duration", "defaultDuration", 60],
    ["cardio", "distance", "defaultDistance", 2],
  ] as const) {
    it(`still fills a missing ${field} value when other sets track it`, () => {
      const ex = exercise(category !== "bodyweight");
      ex.category = category;
      ex.sets[0][field] = value;
      ex.sets[1][field] = null;
      ex.templateExercise = { [defaultField]: value };
      fillCompletedSetDefaults(ex, ex.sets[1], 1, {});
      expect(ex.sets[1][field]).toBe(value);
    });
  }

  it("preserves equipment, per-side, assistance and zero rest time during completion and serialization", () => {
    const ex = exercise();
    ex.perSide = 1;
    ex.isAssisted = 1;
    ex.restTime = 0;
    ex.sets[0].weight = -15;
    fillCompletedSetDefaults(ex, ex.sets[0], 0, {});
    expect(buildSessionExercisesPayload([ex])?.[0]).toMatchObject({
      category: "bodyweight",
      equipment: "Bodyweight",
      perSide: 1,
      isAssisted: 1,
      restTime: 0,
    });
    expect(ex.sets[0].weight).toBe(-15);
  });
});
