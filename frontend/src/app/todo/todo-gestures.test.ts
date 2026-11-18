import { describe, expect, it } from "bun:test";
import { claimGesture, gestureOwner, releaseGesture } from "./todo-gestures";

describe("gesture ownership", () => {
  it("lets the first claimant keep a pointer until it is released", () => {
    expect(claimGesture(1, "swipe")).toBe(true);
    expect(claimGesture(1, "reorder")).toBe(false);
    expect(gestureOwner(1)).toBe("swipe");
    releaseGesture(1);
    expect(gestureOwner(1)).toBeNull();
    expect(claimGesture(1, "reorder")).toBe(true);
    releaseGesture(1);
  });
});
