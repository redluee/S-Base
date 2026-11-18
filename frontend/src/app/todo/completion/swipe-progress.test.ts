import { describe, expect, it } from "bun:test";
import { clampSwipe, resolveSwipe, SWIPE_TINT_MAX, swipeAction, swipeThreshold, swipeVisual } from "./swipe-progress";

describe("swipe progress", () => {
  it("arms at a quarter of the screen width", () => {
    expect(swipeThreshold(400)).toBe(100);
    expect(swipeThreshold(160)).toBe(64);
  });

  it("maps direction to delete or complete", () => {
    expect(swipeAction(-5)).toBe("delete");
    expect(swipeAction(5)).toBe("complete");
    expect(swipeAction(0)).toBeNull();
  });

  it("grows the tint progressively and saturates once armed", () => {
    const half = swipeVisual(-50, 100);
    expect(half).toMatchObject({ action: "delete", progress: 0.5, armed: false });
    expect(half.tintOpacity).toBeLessThan(SWIPE_TINT_MAX);
    const armed = swipeVisual(120, 100);
    expect(armed).toMatchObject({ action: "complete", progress: 1, armed: true, tintOpacity: SWIPE_TINT_MAX });
    expect(swipeVisual(0, 100)).toMatchObject({ action: null, armed: false, tintOpacity: 0 });
  });

  it("resolves the release only past the threshold", () => {
    expect(resolveSwipe(-99, 100)).toBeNull();
    expect(resolveSwipe(-100, 100)).toBe("delete");
    expect(resolveSwipe(150, 100)).toBe("complete");
  });

  it("clamps the offset to the row width", () => {
    expect(clampSwipe(500, 300)).toBe(300);
    expect(clampSwipe(-500, 300)).toBe(-300);
  });
});
