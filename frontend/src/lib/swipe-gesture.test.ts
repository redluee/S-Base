import { describe, expect, it } from "bun:test";
import { clampSwipeOffset, settleSwipeOpen, shouldEngageSwipe } from "./swipe-gesture";

describe("swipe gesture", () => {
  it("engages only for clearly horizontal movement", () => {
    expect(shouldEngageSwipe(-20, 3)).toBe(true);
    expect(shouldEngageSwipe(-5, 0)).toBe(false);
    expect(shouldEngageSwipe(-20, 18)).toBe(false);
    expect(shouldEngageSwipe(2, 40)).toBe(false);
  });
  it("clamps the offset between closed and fully open", () => {
    expect(clampSwipeOffset(0, 30, 44)).toBe(0);
    expect(clampSwipeOffset(0, -100, 44)).toBe(-44);
    expect(clampSwipeOffset(-44, 20, 44)).toBe(-24);
  });
  it("settles by distance or flick velocity", () => {
    expect(settleSwipeOpen(-30, 44)).toBe(true);
    expect(settleSwipeOpen(-10, 44)).toBe(false);
    expect(settleSwipeOpen(-10, 44, -0.8)).toBe(true);
    expect(settleSwipeOpen(-40, 44, 0.8)).toBe(false);
  });
});
