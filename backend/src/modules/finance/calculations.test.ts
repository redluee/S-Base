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
    expect(report.history.map((point) => point.date)).toEqual(["2025-05-01", "2025-05-15"]);
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
});
