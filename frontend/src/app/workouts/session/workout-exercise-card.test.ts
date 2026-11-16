import { describe, expect, it } from "bun:test";
import type { SessionExercise } from "@backend/types/shared";
import { describeTarget } from "./workout-exercise-card";
import { areAllExercisesFinished, exerciseTagLabels, isExerciseFinished } from "./workout-exercise-card-utils";

describe("describeTarget", () => {
  it("uses Dutch number formatting and units", () => {
    expect(describeTarget("resistance", false, { reps: 8, weight: 1020.5 })).toBe("8 x 1.020,5 kg");
    expect(describeTarget("cardio", true, { distance: 5.2, duration: 1800 })).toBe("5,2 km x 30:00");
  });

  it("uses the Dutch reps label instead of English", () => {
    expect(describeTarget("bodyweight", false, { reps: 6, weight: 0 })).toBe("6 herh.");
    expect(describeTarget("isometric", false, { reps: 12, weight: 0 })).toBe("12 herh.");
  });

  it("shows assisted bodyweight targets with a sign and Dutch decimals", () => {
    expect(describeTarget("bodyweight", false, { reps: 6, weight: 12.5 })).toBe("+12,5 kg x 6");
  });

  it("falls back to a dash without a target", () => {
    expect(describeTarget("resistance", false, null)).toBe("—");
  });
});

function exercise(completed: number[], category = "resistance"): SessionExercise {
  return {
    exerciseName: "Oefening",
    sortOrder: 0,
    category,
    sets: completed.map((value, i) => ({ setNumber: i + 1, completed: value, duration: category === "cardio" ? 600 : null })),
  };
}

describe("isExerciseFinished", () => {
  it("is finished when every set is completed", () => {
    expect(isExerciseFinished(exercise([1, 1, 1]))).toBe(true);
  });

  it("is not finished with an open set", () => {
    expect(isExerciseFinished(exercise([1, 0, 1]))).toBe(false);
  });

  it("is not finished without sets", () => {
    expect(isExerciseFinished(exercise([]))).toBe(false);
  });
});

describe("areAllExercisesFinished", () => {
  it("is false for an empty workout", () => {
    expect(areAllExercisesFinished([])).toBe(false);
  });

  it("is true when every exercise is finished", () => {
    expect(areAllExercisesFinished([exercise([1, 1]), exercise([1])])).toBe(true);
  });

  it("is false with one open set", () => {
    expect(areAllExercisesFinished([exercise([1, 1]), exercise([1, 0])])).toBe(false);
  });

  it("is false when an exercise has no sets", () => {
    expect(areAllExercisesFinished([exercise([])])).toBe(false);
  });

  it("counts cardio and timed exercises with completed sets", () => {
    expect(areAllExercisesFinished([exercise([1], "cardio"), exercise([1, 1], "isometric")])).toBe(true);
  });

  it("is false for a mix of finished and zero-set exercises", () => {
    expect(areAllExercisesFinished([exercise([1, 1]), exercise([])])).toBe(false);
  });
});

describe("exerciseTagLabels", () => {
  it("shows only the category without equipment", () => {
    expect(exerciseTagLabels("Free Weights", "", false)).toEqual(["Vrije gewichten"]);
    expect(exerciseTagLabels("Free Weights", null, false)).toEqual(["Vrije gewichten"]);
  });

  it("drops the none placeholder", () => {
    expect(exerciseTagLabels("Bodyweight", "none", false)).toEqual(["Lichaamsgewicht"]);
    expect(exerciseTagLabels("Bodyweight", " None ", false)).toEqual(["Lichaamsgewicht"]);
  });

  it("lists multiple equipment items and ignores extra spaces and empty parts", () => {
    expect(exerciseTagLabels("Free Weights", "  Barbell ,Kettlebell,, ", false)).toEqual([
      "Vrije gewichten",
      "Barbell",
      "Kettlebell",
    ]);
  });

  it("appends the assisted label when set", () => {
    expect(exerciseTagLabels("Bodyweight", "Weighted Vest", true)).toEqual([
      "Lichaamsgewicht",
      "Gewichtsvest",
      "Ondersteund",
    ]);
  });

  it("falls back to the default category when it is missing", () => {
    expect(exerciseTagLabels(null, "Barbell", false)).toEqual(["Vrije gewichten", "Barbell"]);
    expect(exerciseTagLabels(undefined, "", false)).toEqual(["Vrije gewichten"]);
  });
});
