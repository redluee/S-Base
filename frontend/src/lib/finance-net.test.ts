import { expect, it } from "bun:test";
import type { FinanceTransaction } from "@backend/types/finance";
import { netBuckets, netRange } from "./finance-net";

const transaction = (date: string, amountCents: number, internalTransfer = false): FinanceTransaction => ({ id: 1, accountId: 1, date, amountCents, internalTransfer, automaticTransfer: false, name: "Example", description: "" });

it("builds rolling periods across years and leap days", () => {
  expect(netRange("2026-02-28", "year")).toEqual({ start: "2025-03-01", end: "2026-02-28" });
  expect(netRange("2024-03-01", "month").start).toBe("2024-02-01");
  const range = netRange("2026-01-05", "month");
  expect(netBuckets([], range.start, range.end, "month")).toHaveLength(30);
});

it("nets income and expenses while excluding internal transfers and out-of-range transactions", () => {
  const buckets = netBuckets([
    transaction("2025-12-15", 12000), transaction("2025-12-20", -2000),
    transaction("2026-01-01", -4000), transaction("2026-01-02", 50000, true),
    transaction("2026-02-01", 100), transaction("2025-01-01", 100),
  ], "2025-02-01", "2026-01-15", "year");
  expect(buckets).toHaveLength(12);
  expect(buckets[10]).toMatchObject({ date: "2025-12", income: 12000, spending: 2000, net: 10000, count: 2 });
  expect(buckets[11]).toMatchObject({ date: "2026-01", income: 0, spending: 4000, net: -4000, count: 1 });
  expect(buckets[0].net).toBe(0);
});

it("keeps daily buckets and zero net periods", () => {
  expect(netBuckets([transaction("2026-01-01", 100), transaction("2026-01-01", -100)], "2026-01-01", "2026-01-02", "month")).toEqual([
    { date: "2026-01-01", income: 100, spending: 100, net: 0, count: 2 },
    { date: "2026-01-02", income: 0, spending: 0, net: 0, count: 0 },
  ]);
});
