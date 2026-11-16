import { describe, expect, it } from "bun:test";
import { isPrognosisPass, LEARNING_OUTCOME_TARGETS, passProgress, TOTAL_REQUIRED_PASSES } from "./minor";

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

describe("isPrognosisPass", () => {
  const planned = { sprintFinished: false, coveredByStory: true };

  it("keeps the evaluation rule whatever the sprint or its stories", () => {
    const finishedWithoutStories = { sprintFinished: true, coveredByStory: false };
    expect(isPrognosisPass(undefined, "V", finishedWithoutStories)).toBe(true);
    expect(isPrognosisPass("NV", "V", finishedWithoutStories)).toBe(true);
    expect(isPrognosisPass("V", "-", finishedWithoutStories)).toBe(true);
    expect(isPrognosisPass("V", "O", finishedWithoutStories)).toBe(false);
    expect(isPrognosisPass("-", "-", finishedWithoutStories)).toBe(false);
  });

  it("expects a pass for a learning outcome planned in an unfinished sprint", () => {
    expect(isPrognosisPass("-", "-", planned)).toBe(true);
    expect(isPrognosisPass(undefined, undefined, planned)).toBe(true);
    expect(isPrognosisPass(null, null, planned)).toBe(true);
  });

  it("expects nothing from stories once the teacher gave O or the student evaluated NV", () => {
    expect(isPrognosisPass("-", "O", planned)).toBe(false);
    expect(isPrognosisPass("V", "O", planned)).toBe(false);
    expect(isPrognosisPass("NV", "-", planned)).toBe(false);
  });

  it("expects nothing from stories in a finished sprint or without a covering story", () => {
    expect(isPrognosisPass("-", "-", { sprintFinished: true, coveredByStory: true })).toBe(false);
    expect(isPrognosisPass("-", "-", { sprintFinished: false, coveredByStory: false })).toBe(false);
  });
});
