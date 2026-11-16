import { describe, expect, it } from "bun:test";
import { TAP_SLOP_PX, isTap } from "./tap-gesture";

const down = { pointerId: 1, x: 100, y: 200 };

describe("tap gesture", () => {
  it("treats a press and release on the same spot as a tap", () => {
    expect(isTap(down, { pointerId: 1, x: 100, y: 200 })).toBe(true);
  });
  it("tolerates a few pixels of finger jitter", () => {
    expect(isTap(down, { pointerId: 1, x: 104, y: 195 })).toBe(true);
  });
  it("rejects a vertical drag, which is a page scroll", () => {
    expect(isTap(down, { pointerId: 1, x: 100, y: 140 })).toBe(false);
  });
  it("rejects a horizontal drag, which is a swipe", () => {
    expect(isTap(down, { pointerId: 1, x: 100 - TAP_SLOP_PX, y: 200 })).toBe(false);
  });
  it("measures diagonal movement as one distance", () => {
    expect(isTap(down, { pointerId: 1, x: 108, y: 208 })).toBe(false);
  });
  it("rejects a release without a press, as after a cancelled pointer", () => {
    expect(isTap(null, { pointerId: 1, x: 100, y: 200 })).toBe(false);
  });
  it("rejects a release from another pointer", () => {
    expect(isTap(down, { pointerId: 2, x: 100, y: 200 })).toBe(false);
  });
  it("honours a custom slop", () => {
    expect(isTap(down, { pointerId: 1, x: 100, y: 220 }, 30)).toBe(true);
  });
});
