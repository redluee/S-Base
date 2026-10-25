import { describe, expect, it } from "bun:test";
import type { FinanceAccount, FinanceObservation } from "../../types/finance";
import { transferBalances } from "./transfer-balances";

const accounts: FinanceAccount[] = [
  { id: 1, name: "Sample current", bank: null, type: "current", openingDate: "2025-01-01", archived: false },
  { id: 2, name: "Sample savings", bank: null, type: "savings", openingDate: "2025-01-01", archived: false },
];
const observation = (date: string, balanceCents: number): FinanceObservation => ({ id: 1, accountId: 2, date, balanceCents });
const transfer = (date: string, amountCents: number) => ({ accountId: 1, counterpartyAccountId: 2, date, amountCents });

describe("Internal transfer balance projections", () => {
  it("accumulates transfers in either direction and resets to actual bank balances", () => {
    const observations = [observation("2025-01-01", 10000), observation("2025-01-04", 9000)];
    const result = transferBalances(accounts, observations, [
      transfer("2025-01-02", 2000), transfer("2025-01-02", -500),
      transfer("2025-01-03", -1000), transfer("2025-01-04", 500),
      transfer("2025-01-05", 1000),
    ]);
    expect(result.filter((entry) => entry.id === 0).map((entry) => [entry.date, entry.balanceCents])).toEqual([
      ["2025-01-02", 8500], ["2025-01-03", 9500], ["2025-01-05", 8000],
    ]);
    expect(result.find((entry) => entry.date === "2025-01-04")?.balanceCents).toBe(9000);
    expect(observations).toHaveLength(2);
  });
  it("does not invent unknown opening balances or apply self-transfers", () => {
    expect(transferBalances(accounts, [], [transfer("2025-01-02", 1000)])).toEqual([]);
    const observations = [observation("2025-01-03", 10000)];
    expect(transferBalances(accounts, observations, [
      transfer("2025-01-02", 1000),
      { accountId: 2, counterpartyAccountId: 2, date: "2025-01-04", amountCents: 1000 },
    ])).toEqual(observations);
  });
});
