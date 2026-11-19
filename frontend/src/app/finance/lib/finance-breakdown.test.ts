import { describe, expect, it } from "bun:test";
import type { FinanceBreakdownGroup } from "@backend/types/finance";
import { filterBreakdownGroups, formatIban, sharePercent, shareRatio } from "./finance-breakdown";

const group = (name: string, iban: string | null): FinanceBreakdownGroup => ({
  key: `${name}-${iban}`,
  name,
  iban,
  totalCents: 100,
  count: 1,
  lastDate: "2025-01-01",
  transactions: [],
});

describe("Finance breakdown helpers", () => {
  it("formats IBANs in groups of four and leaves other account numbers intact", () => {
    expect(formatIban("NL00DEMO0000000001")).toBe("NL00 DEMO 0000 0000 01");
    expect(formatIban("nl00 demo 0000 0000 01")).toBe("NL00 DEMO 0000 0000 01");
    expect(formatIban("1234567")).toBe("1234567");
    expect(formatIban(null)).toBe("");
  });
  it("expresses shares without misleading zeroes or overflow", () => {
    expect(sharePercent(50, 200)).toBe("25%");
    expect(sharePercent(1, 1000)).toBe("<1%");
    expect(sharePercent(0, 100)).toBe("0%");
    expect(sharePercent(10, 0)).toBe("0%");
    expect(shareRatio(300, 200)).toBe(1);
    expect(shareRatio(10, 0)).toBe(0);
  });
  it("filters by name or IBAN, ignoring case and spacing", () => {
    const groups = [group("Sample employer", "NL00DEMO0000000001"), group("Sample shop", null)];
    expect(filterBreakdownGroups(groups, "")).toEqual(groups);
    expect(filterBreakdownGroups(groups, "SHOP").map((entry) => entry.name)).toEqual(["Sample shop"]);
    expect(filterBreakdownGroups(groups, "demo 0000").map((entry) => entry.name)).toEqual(["Sample employer"]);
    expect(filterBreakdownGroups(groups, "nl00demo").map((entry) => entry.name)).toEqual(["Sample employer"]);
    expect(filterBreakdownGroups(groups, "sample nothing")).toEqual([]);
  });
});
