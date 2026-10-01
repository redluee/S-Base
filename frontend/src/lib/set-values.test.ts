import { describe, expect, it } from "bun:test";
import { applySetUpdate, isUntouchedDefault, type EditableSet } from "./set-values";

const sets = (...weights: Array<number | null>): EditableSet[] =>
  weights.map((weight) => ({ weight, completed: 0 }));

describe("applySetUpdate", () => {
  it("cascades into later sets that still follow the old value", () => {
    const out = applySetUpdate(sets(50, 50, 50), 0, "weight", 60);
    expect(out.map((s) => s.weight)).toEqual([60, 60, 60]);
  });

  it("never overwrites a later set the user changed to another value", () => {
    const out = applySetUpdate(sets(50, 55, 50), 0, "weight", 60);
    expect(out.map((s) => s.weight)).toEqual([60, 55, 60]);
  });

  it("fills empty later sets", () => {
    const out = applySetUpdate(sets(null, null), 0, "weight", 12.5);
    expect(out.map((s) => s.weight)).toEqual([12.5, 12.5]);
  });

  it("skips completed sets and earlier sets", () => {
    const input: EditableSet[] = [
      { weight: 50, completed: 0 },
      { weight: 50, completed: 1 },
      { weight: 50, completed: 0 },
    ];
    const out = applySetUpdate(input, 1, "weight", 70);
    expect(out.map((s) => s.weight)).toEqual([50, 70, 70]);
    const out2 = applySetUpdate(input, 0, "weight", 70);
    expect(out2.map((s) => s.weight)).toEqual([70, 50, 70]);
  });

  it("skips sets the user touched even when the value matches", () => {
    const out = applySetUpdate(sets(50, 50, 50), 0, "weight", 60, (i) => i === 1);
    expect(out.map((s) => s.weight)).toEqual([60, 50, 60]);
  });

  it("does not mutate the input", () => {
    const input = sets(50, 50);
    applySetUpdate(input, 0, "weight", 60);
    expect(input.map((s) => s.weight)).toEqual([50, 50]);
  });
});

describe("isUntouchedDefault", () => {
  it("flags uncompleted values equal to the target", () => {
    expect(isUntouchedDefault({ weight: 50, completed: 0 }, "weight", 50)).toBe(true);
  });
  it("does not flag entered, completed or empty values", () => {
    expect(isUntouchedDefault({ weight: 55, completed: 0 }, "weight", 50)).toBe(false);
    expect(isUntouchedDefault({ weight: 50, completed: 1 }, "weight", 50)).toBe(false);
    expect(isUntouchedDefault({ weight: null, completed: 0 }, "weight", 50)).toBe(false);
    expect(isUntouchedDefault({ weight: 50, completed: 0 }, "weight", null)).toBe(false);
  });
});
