import { describe, expect, it } from "bun:test";
import { defaultSetList, fillCompletedSetDefaults, setsFromHistory } from "./workout-session-helpers";
import { isUntouchedDefault } from "@/lib/set-values";
import { highestCompletedWeight } from "@backend/utils/workout-defaults";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

const history: SessionSet[] = [
  { setNumber: 1, weight: 30, reps: 10, completed: 1 },
  { setNumber: 2, weight: 50, reps: 8, completed: 1 },
  { setNumber: 3, weight: 40, reps: 6, completed: 1 },
  { setNumber: 4, weight: 500, reps: 6, completed: 0 },
];

describe("suggested workout values", () => {
  it("copies the highest performed weight to every set when adding or replacing an exercise", () => {
    const sets = setsFromHistory(history);
    expect(sets.map((set) => set.weight)).toEqual([50, 50, 50]);
    expect(sets.map((set) => set.reps)).toEqual([10, 8, 6]);
    expect(sets.every((set) => isUntouchedDefault(set, "weight", 20))).toBe(true);
  });

  it("marks template defaults as suggested even when they differ from historical targets", () => {
    const sets = defaultSetList(3, 10, 25);
    expect(sets.every((set) => isUntouchedDefault(set, "weight", 50))).toBe(true);
    expect(sets.every((set) => isUntouchedDefault(set, "reps", 8))).toBe(true);
  });

  it("uses the same highest historical weight when completing a blank tracked field", () => {
    const ex: SessionExercise = {
      exerciseName: "Example", sortOrder: 0, category: "resistance",
      sets: [{ setNumber: 1, weight: 0, reps: 8, completed: 0 }, { setNumber: 2, weight: null, reps: 8, completed: 0 }],
      templateExercise: { defaultWeight: 20 },
    };
    fillCompletedSetDefaults(ex, ex.sets[1], 1, { Example: history });
    expect(ex.sets[1].weight).toBe(50);
  });

  it("handles assisted, zero, and missing weights without reviving a template default", () => {
    expect(highestCompletedWeight([{ weight: -20 }, { weight: -10 }])).toBe(-10);
    expect(highestCompletedWeight([{ weight: 0 }])).toBe(0);
    expect(highestCompletedWeight([{ weight: null }])).toBeNull();
  });
});
