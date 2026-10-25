import { describe, expect, it } from "bun:test";
import type { FinanceTransaction } from "../../types/finance";
import { detectSubscriptions } from "./subscriptions";

function payments(dates: string[], overrides: Partial<FinanceTransaction> = {}): FinanceTransaction[] {
  return dates.map((date, index) => ({
    id: index + 1, accountId: 1, date, amountCents: -1200,
    name: "Sample subscription", description: "", internalTransfer: false, automaticTransfer: false,
    ...overrides,
  }));
}

describe("Subscription detection", () => {
  it("recognizes monthly payments across short months and price changes, summing actual spending", () => {
    const entries = payments(["2025-01-31", "2025-02-28", "2025-03-31"]);
    entries[2].amountCents = -1500;
    entries[1].name = "  SAMPLE   subscription  ";
    const report = detectSubscriptions(entries.reverse(), "2025-04-10");
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]).toMatchObject({ cadence: "monthly", paymentCents: 1500, monthlyCents: 1500, totalCents: 3900, paymentCount: 3, active: true, firstDate: "2025-01-31", lastDate: "2025-03-31" });
    expect(report.monthlyCents).toBe(1500);
    expect(report.totalCents).toBe(3900);
  });
  it("normalizes annual, quarterly, weekly and fortnightly payments", () => {
    for (const [dates, cadence, monthlyCents] of [
      [["2024-04-01", "2025-04-01"], "yearly", 100],
      [["2025-01-01", "2025-04-01"], "quarterly", 400],
      [["2025-03-18", "2025-03-25", "2025-04-01"], "weekly", 5200],
      [["2025-03-04", "2025-03-18", "2025-04-01"], "fortnightly", 2600],
      [["2025-01-07", "2025-02-04", "2025-03-04", "2025-04-01"], "fourWeekly", 1300],
    ] as const) {
      expect(detectSubscriptions(payments([...dates]), "2025-04-01").entries[0]).toMatchObject({ cadence, monthlyCents });
    }
  });
  it("excludes transfers, income, future payments, unnamed entries and irregular purchases", () => {
    const regular = ["2025-01-01", "2025-02-01"];
    const report = detectSubscriptions([
      ...payments(regular, { internalTransfer: true }),
      ...payments(regular, { amountCents: 1200 }),
      ...payments(regular, { name: " " }),
      ...payments(["2026-01-01", "2026-02-01"]),
      ...payments(["2025-01-01", "2025-01-03", "2025-01-20"], { name: "Sample shop" }),
      ...payments(["2025-01-01"], { name: "One off" }),
    ], "2025-04-01");
    expect(report.entries).toEqual([]);
    expect(report.lastImportedDate).toBe("2025-02-01");
  });
  it("retains older spending without adding it to current monthly costs and separates accounts", () => {
    const report = detectSubscriptions([
      ...payments(["2024-01-01", "2024-02-01"]),
      ...payments(["2025-03-01", "2025-04-01"], { accountId: 2 }),
    ], "2025-04-10");
    expect(report.entries).toHaveLength(2);
    expect(report.entries.map((entry) => entry.active)).toEqual([true, false]);
    expect(report.monthlyCents).toBe(1200);
    expect(report.totalCents).toBe(4800);
  });
  it("returns an empty report without transaction history", () => {
    expect(detectSubscriptions([], "2025-04-01")).toEqual({ entries: [], monthlyCents: 0, totalCents: 0, asOf: "2025-04-01", lastImportedDate: null });
  });
});
