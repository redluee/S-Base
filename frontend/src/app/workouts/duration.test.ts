import { describe, expect, it } from "bun:test";
import { formatClock, formatClockInput, formatMinutesSeconds, parseClock } from "./duration";

describe("workout durations", () => {
  it("round-trips clock input and parses bare seconds", () => {
    for (const seconds of [0, 59, 90, 3599]) expect(parseClock(formatClockInput(seconds))).toBe(seconds);
    expect(parseClock("45")).toBe(45);
    expect(parseClock(" ")).toBeNull();
    expect(parseClock("abc")).toBeNull();
  });

  it("shows hours only when needed and keeps the sign of overtime", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-30)).toBe("-0:30");
    expect(formatClock(null)).toBe("");
    expect(formatMinutesSeconds(125)).toBe("2m 5s");
  });
});
