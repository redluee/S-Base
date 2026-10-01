import { describe, expect, it } from "bun:test";
import { formatHistoryWeight } from "./set-display";

describe("formatHistoryWeight", () => {
  it("shows the magnitude for assisted bodyweight sets, never a negative value", () => {
    expect(formatHistoryWeight(-20, "bodyweight", true)).toBe("20");
    expect(formatHistoryWeight(-12.5, "bodyweight", true)).toBe("12,5");
    expect(formatHistoryWeight(-20, "bodyweight", false)).toBe("20");
  });
  it("shows added weight with a plus and BW for zero", () => {
    expect(formatHistoryWeight(10, "bodyweight", false)).toBe("+10");
    expect(formatHistoryWeight(0, "bodyweight", false)).toBe("BW");
  });
  it("formats resistance weights in Dutch notation", () => {
    expect(formatHistoryWeight(1020.5, "resistance", false)).toBe("1.020,5");
    expect(formatHistoryWeight(null, "resistance", false)).toBe("—");
  });
});
