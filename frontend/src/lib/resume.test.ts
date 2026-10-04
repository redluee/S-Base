import { describe, expect, it } from "bun:test";
import { formatPeriod, formatMonthYear, snapColumnWidth, resolveCuratedFont, fontLabel } from "./resume";

describe("resume helpers", () => {
  it("formats periods with Dutch months", () => {
    expect(formatMonthYear(2, 2026)).toBe("Februari 2026");
    expect(formatPeriod({ startMonth: 2, startYear: 2026, endMonth: null, endYear: null, isCurrent: true })).toBe("Februari 2026 – HEDEN");
    expect(formatPeriod({ startMonth: 9, startYear: 2025, endMonth: 1, endYear: 2026, isCurrent: false })).toBe("September 2025 – Januari 2026");
  });

  it("snaps column widths to 2.5% steps within bounds", () => {
    expect(snapColumnWidth(71)).toBe(70);
    expect(snapColumnWidth(74)).toBe(75);
    expect(snapColumnWidth(10)).toBe(50);
    expect(snapColumnWidth(99)).toBe(80);
  });

  it("resolves curated fonts", () => {
    expect(resolveCuratedFont("carlito")?.family).toBe("resume-carlito");
    expect(resolveCuratedFont("nope")).toBeNull();
    expect(fontLabel("google:Open Sans")).toBe("Open Sans");
  });
});
