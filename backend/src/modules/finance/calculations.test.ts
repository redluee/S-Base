import { describe, expect, it } from "bun:test";
import type { FinanceAccount, FinanceObservation } from "../../types/finance";
import { dashboard } from "./calculations";

const accounts: FinanceAccount[] = [
  { id: 1, name: "Sample account", bank: null, type: "current", openingDate: "2020-01-01", archived: false },
];
const balance = (date: string, balanceCents: number): FinanceObservation => ({ id: 1, accountId: 1, date, balanceCents });

describe("Inclusive calendar period balance changes", () => {
  it("includes the first day's change while keeping chart dates inside the month", () => {
    const report = dashboard(accounts, [
      balance("2025-04-30", 10000),
      balance("2025-05-01", 11500),
      balance("2025-05-15", 12000),
    ], "month", "2025-05-15");

    expect(report.startDate).toBe("2025-05-01");
    expect(report.start.date).toBe("2025-04-30");
    expect(report.start.totalCents).toBe(10000);
    expect(report.comparison.changeCents).toBe(2000);
    expect(report.history).toHaveLength(15);
    expect(report.history[0].date).toBe("2025-05-01");
    expect(report.history.at(-1)?.date).toBe("2025-05-15");
    expect(report.history[1].totalCents).toBe(11500);
  });

  it("includes January 1 even when it is the only selected day", () => {
    const observations = [balance("2024-12-31", 10000), balance("2025-01-01", 12500)];
    for (const period of ["month", "year"] as const) {
      const report = dashboard(accounts, observations, period, "2025-01-01");
      expect(report.start.date).toBe("2024-12-31");
      expect(report.comparison.changeCents).toBe(2500);
    }
  });

  it("uses February 29 as the March baseline in a leap year", () => {
    const report = dashboard(accounts, [
      balance("2024-02-28", 10000), balance("2024-02-29", 12000), balance("2024-03-01", 13000),
    ], "month", "2024-03-01");
    expect(report.start.date).toBe("2024-02-29");
    expect(report.comparison.changeCents).toBe(1000);
  });

  it("reports missing coverage instead of using the first day's closing balance as a baseline", () => {
    const report = dashboard(accounts, [balance("2025-05-01", 11500), balance("2025-05-15", 12000)], "month", "2025-05-15");
    expect(report.comparison.changeCents).toBeNull();
    expect(report.comparison.reason).toBe("coverage");
  });

  it("only crops the same daily totals when switching periods and end dates", () => {
    const cohort: FinanceAccount[] = [
      accounts[0],
      { ...accounts[0], id: 2, type: "savings", openingDate: "2025-01-01" },
      { ...accounts[0], id: 3, type: "savings", openingDate: "2025-05-03", archived: true },
    ];
    const observations = [
      balance("2025-01-01", 10000),
      { ...balance("2025-01-01", 20000), accountId: 2 },
      balance("2025-05-02", 8000),
      { ...balance("2025-05-02", 22000), accountId: 2 },
      { ...balance("2025-05-03", 5000), accountId: 3 },
      balance("2025-05-06", 7000),
      { ...balance("2025-09-01", 99999), accountId: 2 },
    ];
    const all = dashboard(cohort, observations, "all", "2025-12-31");
    const year = dashboard(cohort, observations, "year", "2025-06-30");
    const month = dashboard(cohort, observations, "month", "2025-05-31");
    for (const report of [year, month]) {
      expect(report.history).toEqual(all.history.filter((point) =>
        point.date >= report.startDate && point.date <= report.endDate));
      for (const point of report.history) {
        expect(point.totalCents).toBe(point.accounts.reduce((sum, account) => sum + account.balanceCents!, 0));
      }
    }
    expect(month.history).toHaveLength(31);
    expect(month.history.slice(0, 7).map((point) => point.totalCents)).toEqual([
      30000, 30000, 35000, 35000, 35000, 34000, 34000,
    ]);
  });
});
