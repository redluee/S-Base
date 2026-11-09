import { describe, expect, it } from "bun:test";
import { describeTarget } from "./workout-exercise-card";

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
