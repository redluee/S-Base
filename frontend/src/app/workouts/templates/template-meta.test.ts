import { describe, expect, it } from "bun:test";
import { guessWorkoutIcon, sessionIcon, splitMuscleGroups, templateIcon } from "./template-meta";

describe("workout icons", () => {
  it("guesses an icon from Dutch and English names", () => {
    expect(guessWorkoutIcon("Benen & Core", "Benen, Core")).toBe("footprints");
    expect(guessWorkoutIcon("Rug en Biceps", "Rug, Biceps")).toBe("person");
    expect(guessWorkoutIcon("Borst en Triceps", null)).toBe("dumbbell");
    expect(guessWorkoutIcon("Morning mobility")).toBe("flower");
    expect(guessWorkoutIcon("Test", "full body")).toBe("flame");
  });

  it("prefers the chosen template icon", () => {
    expect(templateIcon({ icon: "trophy", name: "Benen" })).toBe("trophy");
    expect(templateIcon({ icon: null, name: "Benen" })).toBe("footprints");
    expect(templateIcon({ icon: "nonsense", name: "Benen" })).toBe("footprints");
  });

  it("gives quick start sessions a lightning bolt", () => {
    expect(sessionIcon({ templateId: null, templateIcon: null, name: "Benen" })).toBe("zap");
    expect(sessionIcon({ templateId: 3, templateIcon: "rocket", name: "Benen" })).toBe("rocket");
    expect(sessionIcon({ templateId: 3, templateIcon: null, name: "Benen" })).toBe("footprints");
  });
});

describe("splitMuscleGroups", () => {
  it("splits and dedupes groups", () => {
    expect(splitMuscleGroups(" Rug ,rug, Biceps,")).toEqual(["Rug", "Biceps"]);
    expect(splitMuscleGroups(null)).toEqual([]);
  });
});
