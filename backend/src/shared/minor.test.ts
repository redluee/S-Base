import { describe, expect, it } from "bun:test";
import { LEARNING_OUTCOME_TARGETS, passProgress, TOTAL_REQUIRED_PASSES } from "./minor";

describe("passProgress", () => {
  it("passes only when every learning outcome meets its target and the total is reached", () => {
    expect(passProgress({ ...LEARNING_OUTCOME_TARGETS, 5: 12 })).toEqual({
      total: TOTAL_REQUIRED_PASSES,
      allMinimumsMet: true,
      totalTargetMet: true,
    });
  });

  it("reports the minimums and the total separately", () => {
    expect(passProgress(LEARNING_OUTCOME_TARGETS)).toEqual({ total: 18, allMinimumsMet: true, totalTargetMet: false });
    expect(passProgress({ 1: 0, 2: 10, 3: 2, 4: 4, 5: 8 })).toEqual({
      total: 24,
      allMinimumsMet: false,
      totalTargetMet: true,
    });
    expect(passProgress({})).toEqual({ total: 0, allMinimumsMet: false, totalTargetMet: false });
  });
});
