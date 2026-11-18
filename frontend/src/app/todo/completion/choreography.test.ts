import { describe, expect, it } from "bun:test";
import {
  COLLAPSE_MS,
  completionSteps,
  deletionDuration,
  DRAIN_MS,
  FILL_MS,
  GAP_OPEN_MS,
  returningDuration,
  SQUASH_MS,
  stepsEnd,
  SWIPE_OUT_MS,
  UNSQUASH_MS,
  WAVE_MS,
} from "./choreography";

describe("completion choreography", () => {
  it("fills, waves, squashes and dusts in order with the spec timings", () => {
    expect(completionSteps()).toEqual([
      { phase: "filling", at: 0, duration: 120 },
      { phase: "waving", at: 120, duration: 300 },
      { phase: "squashing", at: 420, duration: 180 },
      { phase: "dusting", at: 600, duration: COLLAPSE_MS },
    ]);
    expect(FILL_MS + WAVE_MS + SQUASH_MS).toBe(600);
  });

  it("commits once the gap has closed", () => {
    expect(stepsEnd(completionSteps())).toBe(600 + COLLAPSE_MS);
    expect(stepsEnd([])).toBe(0);
  });

  it("returns and deletes within their windows", () => {
    expect(returningDuration()).toBe(GAP_OPEN_MS + UNSQUASH_MS + DRAIN_MS);
    expect(DRAIN_MS).toBe(300);
    expect(deletionDuration()).toBe(SWIPE_OUT_MS + COLLAPSE_MS);
  });
});
