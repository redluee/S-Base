import { describe, expect, it } from "bun:test";
import {
  SWIPE_DELETE_MIN_PX,
  SWIPE_DELETE_RATIO,
  clampSwipeOffset,
  isSwipeDeleteArmed,
  resolveSwipeRelease,
  settleSwipeOpen,
  shouldEngageSwipe,
  swipeDeleteThreshold,
} from "./swipe-gesture";

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
  it("clamps to the full visible travel", () => {
    expect(clampSwipeOffset(0, -200, 375)).toBe(-200);
    expect(clampSwipeOffset(-44, -200, 375)).toBe(-244);
    expect(clampSwipeOffset(0, -500, 375)).toBe(-375);
    expect(clampSwipeOffset(-44, 100, 375)).toBe(0);
  });
  it("settles by distance or flick velocity", () => {
    expect(settleSwipeOpen(-30, 44)).toBe(true);
    expect(settleSwipeOpen(-10, 44)).toBe(false);
    expect(settleSwipeOpen(-10, 44, -0.8)).toBe(true);
    expect(settleSwipeOpen(-40, 44, 0.8)).toBe(false);
  });
});

describe("swipe to delete", () => {
  it("uses a share of the row width with a pixel floor as delete threshold", () => {
    expect(SWIPE_DELETE_MIN_PX).toBe(96);
    expect(SWIPE_DELETE_RATIO).toBe(0.28);
    expect(swipeDeleteThreshold(375)).toBeCloseTo(105);
    expect(swipeDeleteThreshold(320)).toBe(96);
    expect(swipeDeleteThreshold(240)).toBe(96);
    expect(swipeDeleteThreshold(0)).toBe(96);
  });
  it("arms at the threshold and un-arms below it", () => {
    expect(isSwipeDeleteArmed(-159, 160)).toBe(false);
    expect(isSwipeDeleteArmed(-160, 160)).toBe(true);
    expect(isSwipeDeleteArmed(-300, 160)).toBe(true);
    expect(isSwipeDeleteArmed(0, 160)).toBe(false);
  });
  it("deletes when released past the threshold", () => {
    expect(resolveSwipeRelease(-190, 44, 187.5)).toBe("delete");
    expect(resolveSwipeRelease(-375, 44, 187.5, -2)).toBe("delete");
    expect(resolveSwipeRelease(-190, 44, 187.5, 0.8)).toBe("delete");
  });
  it("stays open when released between the action width and the threshold", () => {
    expect(resolveSwipeRelease(-100, 44, 187.5)).toBe("open");
    expect(resolveSwipeRelease(-187, 44, 187.5)).toBe("open");
    expect(resolveSwipeRelease(-30, 44, 187.5)).toBe("open");
  });
  it("closes after a short swipe", () => {
    expect(resolveSwipeRelease(-10, 44, 187.5)).toBe("closed");
    expect(resolveSwipeRelease(0, 44, 187.5)).toBe("closed");
  });
  it("never deletes on a fast flick short of the threshold", () => {
    expect(resolveSwipeRelease(-20, 44, 187.5, -3)).toBe("open");
    expect(resolveSwipeRelease(-120, 44, 187.5, -10)).toBe("open");
    expect(resolveSwipeRelease(-186, 44, 160 + 27.5, -50)).toBe("open");
  });
  it("closes when an open row is dragged back to the right", () => {
    expect(resolveSwipeRelease(clampSwipeOffset(-44, 30, 375), 44, 187.5)).toBe("closed");
    expect(resolveSwipeRelease(clampSwipeOffset(-44, 80, 375), 44, 187.5, 0.8)).toBe("closed");
    expect(resolveSwipeRelease(-100, 44, 187.5, 0.8)).toBe("closed");
  });
});
