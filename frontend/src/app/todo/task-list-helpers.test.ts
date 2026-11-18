import { describe, expect, it } from "bun:test";
import { edgeScrollSpeed, moveFromSlot, shiftFor, targetIndex } from "./task-list-helpers";

const rects = [0, 1, 2, 3].map((i) => ({ top: i * 50, height: 50 }));

describe("targetIndex", () => {
  it("stays put near the original slot", () => {
    expect(targetIndex(rects, 1, 75)).toBe(1);
  });

  it("moves down and up past neighbours", () => {
    expect(targetIndex(rects, 0, 130)).toBe(2);
    expect(targetIndex(rects, 3, 10)).toBe(0);
    expect(targetIndex(rects, 0, 500)).toBe(3);
  });
});

describe("shiftFor", () => {
  it("shifts the rows between the original and target slot", () => {
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2, 50))).toEqual([0, -50, -50, 0]);
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1, 50))).toEqual([0, 50, 50, 0]);
  });
});

describe("moveFromSlot", () => {
  const ids = [10, 20, 30, 40];

  it("uses the visible task above as afterId", () => {
    expect(moveFromSlot(ids, 0, 2)).toEqual({ afterId: 30, beforeId: null });
    expect(moveFromSlot(ids, 3, 1)).toEqual({ afterId: 10, beforeId: null });
  });

  it("falls back to beforeId at the top", () => {
    expect(moveFromSlot(ids, 2, 0)).toEqual({ afterId: null, beforeId: 10 });
  });

  it("returns null when nothing changes", () => {
    expect(moveFromSlot(ids, 1, 1)).toBeNull();
  });
});

describe("edgeScrollSpeed", () => {
  it("scrolls near the edges only", () => {
    expect(edgeScrollSpeed(400, 800)).toBe(0);
    expect(edgeScrollSpeed(10, 800)).toBeLessThan(0);
    expect(edgeScrollSpeed(790, 800)).toBeGreaterThan(0);
    expect(edgeScrollSpeed(-50, 800)).toBe(-18);
  });
});
