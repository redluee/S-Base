import { afterEach, describe, expect, it, jest } from "bun:test";
import {
  arrayMove,
  createDebouncedSaver,
  moveForReorder,
  reorderIndex,
  shouldDismissDrag,
} from "./block-motion";

describe("dismiss", () => {
  it("needs distance or a quick flick", () => {
    expect(shouldDismissDrag(100, 0)).toBe(true);
    expect(shouldDismissDrag(40, 0.2)).toBe(false);
    expect(shouldDismissDrag(40, 0.9)).toBe(true);
    expect(shouldDismissDrag(10, 2)).toBe(false);
  });
});

describe("debounced saver", () => {
  afterEach(() => jest.useRealTimers());

  it("saves the latest value after the delay and flushes on demand", () => {
    jest.useFakeTimers();
    const saved: string[] = [];
    const saver = createDebouncedSaver<string>((v) => saved.push(v), 400);
    saver.schedule("a");
    saver.schedule("ab");
    jest.advanceTimersByTime(399);
    expect(saved).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(saved).toEqual(["ab"]);
    saver.schedule("abc");
    expect(saver.pending()).toBe(true);
    saver.flush();
    expect(saved).toEqual(["ab", "abc"]);
    saver.flush();
    expect(saved).toHaveLength(2);
    saver.schedule("x");
    saver.cancel();
    jest.advanceTimersByTime(1000);
    expect(saved).toHaveLength(2);
  });
});

describe("reorder", () => {
  it("finds the target slot from row centres", () => {
    expect(reorderIndex([10, 30, 50], 5)).toBe(0);
    expect(reorderIndex([10, 30, 50], 35)).toBe(2);
    expect(reorderIndex([10, 30, 50], 500)).toBe(3);
  });

  it("builds move payloads", () => {
    expect(moveForReorder([1, 2, 3], 0, 2)).toEqual({ afterId: 3, beforeId: null });
    expect(moveForReorder([1, 2, 3], 2, 0)).toEqual({ afterId: null, beforeId: 1 });
    expect(moveForReorder([1, 2, 3], 0, 1)).toEqual({ afterId: 2, beforeId: 3 });
    expect(moveForReorder([1, 2, 3], 1, 1)).toBeNull();
    expect(arrayMove([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });
});
