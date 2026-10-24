import { describe, expect, it } from "bun:test";
import type { FinanceTransaction } from "@backend/types/finance";
import { historyTransactionsByDate, loadHistoryTransactions } from "./finance-history-transactions";

const entry = (id: number, accountId = 1, date = "2025-01-01"): FinanceTransaction => ({
  id, accountId, date, amountCents: -100, name: "Sample transaction", description: "", internalTransfer: false, automaticTransfer: false,
});

describe("Graph detail transactions", () => {
  it("loads all pages so names after the first page are included", async () => {
    const calls: number[] = [];
    const entries = await loadHistoryTransactions("2025-01-01", "2025-01-31", async (start, end, page) => {
      expect([start, end]).toEqual(["2025-01-01", "2025-01-31"]);
      calls.push(page);
      return { entries: [entry(page)], page, pageSize: 1, total: 2 };
    }, () => false);
    expect(calls).toEqual([1, 2]);
    expect(entries.map((value) => value.id)).toEqual([1, 2]);
  });

  it("discards an outdated response before requesting further pages", async () => {
    let cancelled = false;
    let calls = 0;
    const entries = await loadHistoryTransactions("2025-01-01", "2025-01-31", async () => {
      calls++;
      cancelled = true;
      return { entries: [entry(1)], page: 1, pageSize: 1, total: 2 };
    }, () => cancelled);
    expect(entries).toEqual([]);
    expect(calls).toBe(1);
  });

  it("matches dates and selected accounts while retaining same-day names and transfers", () => {
    const entries = [entry(1), { ...entry(2, 2), internalTransfer: true }, entry(3, 3), entry(4, 2, "2025-01-02")];
    const grouped = historyTransactionsByDate(entries, [1, 2]);
    expect(grouped.get("2025-01-01")?.map((value) => value.id)).toEqual([1, 2]);
    expect(grouped.get("2025-01-02")?.map((value) => value.id)).toEqual([4]);
    expect(historyTransactionsByDate(entries, [2]).get("2025-01-01")?.map((value) => value.id)).toEqual([2]);
    expect(historyTransactionsByDate(entries, []).size).toBe(0);
  });
});
