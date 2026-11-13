import { describe, expect, it } from "bun:test";
import { COLUMN_WIDTH, isInRange } from "@backend/shared/resume";
import { formatPeriod, formatMonthYear, snapColumnWidth, resolveCuratedFont } from "./resume";

describe("resume helpers", () => {
  it("formats periods with Dutch months", () => {
    expect(formatMonthYear(2, 2026)).toBe("Februari 2026");
    expect(formatPeriod({ startMonth: 2, startYear: 2026, endMonth: null, endYear: null, isCurrent: true })).toBe("Februari 2026 – HEDEN");
    expect(formatPeriod({ startMonth: 9, startYear: 2025, endMonth: 1, endYear: 2026, isCurrent: false })).toBe("September 2025 – Januari 2026");
  });

  it("snaps column widths to values the backend accepts", () => {
    for (const raw of [10, 52.5, 71, 74, 99]) {
      expect(isInRange(snapColumnWidth(raw), COLUMN_WIDTH)).toBe(true);
    }
    expect(snapColumnWidth(74)).toBe(75);
  });

  it("resolves curated fonts", () => {
    expect(resolveCuratedFont("carlito")?.family).toBe("resume-carlito");
    expect(resolveCuratedFont("nope")).toBeNull();
  });
});
