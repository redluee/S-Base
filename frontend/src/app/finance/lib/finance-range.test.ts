import { describe, expect, it } from "bun:test";
import { compactRangeLabel, matchingPreset, presetRange, rangeError, rangeLabel, shiftDays } from "./finance-range";

describe("Finance custom ranges", () => {
  it("shifts calendar days across month, year and leap boundaries", () => {
    expect(shiftDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDays("2025-12-31", 1)).toBe("2026-01-01");
  });
  it("builds inclusive presets ending today", () => {
    expect(presetRange("7d", "2026-11-19")).toEqual({ start: "2026-11-13", end: "2026-11-19" });
    expect(presetRange("30d", "2026-03-01")).toEqual({ start: "2026-01-31", end: "2026-03-01" });
    expect(presetRange("12m", "2026-11-19")).toEqual({ start: "2025-11-20", end: "2026-11-19" });
    expect(presetRange("12m", "2024-02-29")).toEqual({ start: "2023-03-01", end: "2024-02-29" });
    expect(presetRange("ytd", "2026-11-19")).toEqual({ start: "2026-01-01", end: "2026-11-19" });
    expect(matchingPreset({ start: "2026-11-13", end: "2026-11-19" }, "2026-11-19")).toBe("7d");
    expect(matchingPreset({ start: "2026-11-12", end: "2026-11-19" }, "2026-11-19")).toBeNull();
  });
  it("rejects incomplete, reversed and future ranges", () => {
    expect(rangeError({ start: "2026-01-01", end: "2026-11-19" }, "2026-11-19")).toBeNull();
    expect(rangeError({ start: "", end: "2026-11-19" }, "2026-11-19")).toBe("finance.range.invalid");
    expect(rangeError({ start: "1899-12-31", end: "2026-11-19" }, "2026-11-19")).toBe("finance.range.invalid");
    expect(rangeError({ start: "2026-02-01", end: "2026-01-01" }, "2026-11-19")).toBe("finance.range.reversed");
    expect(rangeError({ start: "2026-01-01", end: "2026-11-20" }, "2026-11-19")).toBe("finance.range.future");
  });
  it("labels ranges compactly, adding the year only where needed", () => {
    expect(rangeLabel({ start: "2026-02-10", end: "2026-03-15" })).toBe("10 feb – 15 mrt 2026");
    expect(rangeLabel({ start: "2025-12-10", end: "2026-01-05" })).toBe("10 dec 2025 – 5 jan 2026");
    expect(rangeLabel({ start: "2026-03-15", end: "2026-03-15" })).toBe("15 mrt 2026");
    expect(compactRangeLabel({ start: "2026-03-01", end: "2026-04-15" }, "2026-11-19")).toBe("1 mrt – 15 apr");
    expect(compactRangeLabel({ start: "2026-03-15", end: "2026-03-15" }, "2026-11-19")).toBe("15 mrt");
    expect(compactRangeLabel({ start: "2025-03-01", end: "2026-04-15" }, "2026-11-19")).toBe("1 mrt 2025 – 15 apr 2026");
  });
});
