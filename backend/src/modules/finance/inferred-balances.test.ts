import { describe, expect, it } from "bun:test";
import type { FinanceData } from "../../types/finance";
import { dashboard } from "./calculations";
import { inferredBalances, type AccountTransfer } from "./inferred-balances";

const data: FinanceData = {
  accounts: [{ id: 1, name: "Sample payment", bank: null, type: "current", openingDate: "2025-01-01", archived: false }],
  observations: [
    { id: 1, accountId: 1, date: "2025-01-01", balanceCents: 10000 },
    { id: 2, accountId: 1, date: "2025-01-02", balanceCents: 14000 },
    { id: 3, accountId: 1, date: "2025-01-04", balanceCents: 15000 },
    { id: 4, accountId: 1, date: "2025-03-01", balanceCents: 12000 },
    { id: 5, accountId: 1, date: "2025-04-01", balanceCents: 15000 },
  ],
  monthlyBudgetCents: null, goals: [], allocations: [], today: "2025-12-31",
};
const transfer = (date: string, amountCents: number, counterpartyIdentity = "sample-closed-account"): AccountTransfer => ({
  date, amountCents, counterpartyIdentity, accountId: 1, savings: true,
});

describe("Balances of missing own accounts", () => {
  it("keeps a closing payout neutral and preserves subsequent income", () => {
    const before = structuredClone(data);
    const calculated = inferredBalances(data, [transfer("2025-01-02", 4000)]);
    const report = dashboard(calculated.accounts, calculated.observations, "month", "2025-01-04");
    expect(report.history.map((point) => point.totalCents)).toEqual([14000, 14000, 14000, 15000]);
    expect(report.history.map((point) => point.savingsCents)).toEqual([4000, 0, 0, 0]);
    expect(report.end.accounts.find((account) => account.inferred)?.balanceCents).toBe(0);
    expect(data).toEqual(before);
  });

  it("handles multiple accounts, deposits, later closures and period changes", () => {
    const transfers = [transfer("2025-01-02", 4000), transfer("2025-03-01", -3000, "sample-second-account"), transfer("2025-04-01", 3000, "sample-second-account")];
    const calculated = inferredBalances(data, transfers);
    const all = dashboard(calculated.accounts, calculated.observations, "all", "2025-12-31");
    for (const [period, end] of [["year", "2025-06-30"], ["month", "2025-01-31"], ["month", "2025-03-31"], ["month", "2025-04-30"]] as const) {
      const filtered = dashboard(calculated.accounts, calculated.observations, period, end);
      expect(filtered.history).toEqual(all.history.filter((point) => point.date >= filtered.startDate && point.date <= filtered.endDate));
    }
    for (const date of ["2025-03-01", "2025-04-01"]) {
      expect(all.history.find((point) => point.date === date)?.totalCents).toBe(15000);
    }
    expect(all.end.accounts.filter((account) => account.inferred)).toHaveLength(2);
    expect(all.end.savingsCents).toBe(0);
  });

  it("does not assume an unimported account is closed or allow negative inferred savings", () => {
    const calculated = inferredBalances(data, [transfer("2025-03-01", -3000)]);
    const report = dashboard(calculated.accounts, calculated.observations, "all", "2025-12-31");
    expect(report.end.savingsCents).toBe(3000);
    expect(report.history.every((point) => point.accounts.filter((account) => account.inferred).every((account) => account.balanceCents! >= 0))).toBe(true);
    expect(calculated.accounts.find((account) => account.inferred)?.name).not.toContain("sample-closed-account");
  });

  it("nets same-day transfers before deriving an opening balance and keeps IDs stable", () => {
    const transfers = [transfer("2025-01-02", 4000), transfer("2025-01-02", -4000)];
    const forward = inferredBalances(data, transfers);
    const reverse = inferredBalances(data, [...transfers].reverse());
    expect(forward).toEqual(reverse);
    expect(forward.observations.filter((entry) => entry.accountId < 0).every((entry) => entry.balanceCents === 0)).toBe(true);
    const extended = inferredBalances(data, [...transfers, transfer("2025-04-01", 500, "another-account")]);
    expect(extended.accounts.some((account) => account.id === forward.accounts.at(-1)!.id)).toBe(true);
  });

  it("uses imported balances instead of counting the inferred counterpart twice", () => {
    const imported: FinanceData = {
      ...data,
      accounts: [...data.accounts, { ...data.accounts[0], id: 2, type: "savings" }],
      observations: [...data.observations,
        { id: 6, accountId: 2, date: "2025-01-01", balanceCents: 4000 },
        { id: 7, accountId: 2, date: "2025-01-02", balanceCents: 0 },
      ],
    };
    const calculated = inferredBalances(imported, [{ ...transfer("2025-01-02", 4000), counterpartyAccountId: 2 }]);
    expect(calculated.accounts).toHaveLength(2);
    expect(calculated.accounts.some((account) => account.inferred)).toBe(false);
    const report = dashboard(calculated.accounts, calculated.observations, "month", "2025-01-02");
    expect(report.history.map((point) => point.totalCents)).toEqual([14000, 14000]);
  });

  it("does not label an unknown transfer counterparty as savings", () => {
    const calculated = inferredBalances(data, [{ ...transfer("2025-01-02", 4000), savings: false }]);
    const report = dashboard(calculated.accounts, calculated.observations, "month", "2025-01-02");
    expect(report.history.map((point) => point.totalCents)).toEqual([14000, 14000]);
    expect(report.history.map((point) => point.savingsCents)).toEqual([0, 0]);
    expect(report.end.accounts.find((account) => account.inferred)?.type).toBe("untracked");
  });
});
