import { expect, it } from "bun:test";
import type { FinanceTransaction } from "@backend/types/finance";
import { netBuckets, netRange } from "./finance-net";

const transaction = (date: string, amountCents: number, internalTransfer = false): FinanceTransaction => ({ id: 1, accountId: 1, date, amountCents, internalTransfer, automaticTransfer: false, name: "Example", description: "" });

it("starts at January of the selected year, including leap years and year boundaries", () => {
  for (const end of ["2026-01-01", "2026-02-28", "2024-02-29", "2026-12-31"]) {
    expect(netRange(end)).toEqual({ start: `${end.slice(0, 4)}-01-01`, end });
  }
});

it("only includes months and transactions from the selected year through the end date", () => {
  const { start, end } = netRange("2026-03-15");
  const buckets = netBuckets([
    transaction("2025-12-31", 9000),
    transaction("2026-01-01", 12000),
    transaction("2026-03-15", -2000),
    transaction("2026-03-16", 5000),
  ], start, end);
  expect(buckets.map((bucket) => bucket.date)).toEqual(["2026-01", "2026-02", "2026-03"]);
  expect(buckets.map((bucket) => bucket.net)).toEqual([12000, 0, -2000]);
  const fullYear = netRange("2026-12-31");
  expect(netBuckets([], fullYear.start, fullYear.end)).toHaveLength(12);
});

it("nets income and expenses while excluding internal transfers and out-of-range transactions", () => {
  const buckets = netBuckets([
    transaction("2025-12-15", 12000), transaction("2025-12-20", -2000),
    transaction("2026-01-01", -4000), transaction("2026-01-02", 50000, true),
    transaction("2026-02-01", 100), transaction("2025-01-01", 100),
  ], "2025-02-01", "2026-01-15");
  expect(buckets).toHaveLength(12);
  expect(buckets[10]).toMatchObject({ date: "2025-12", income: 12000, spending: 2000, net: 10000, count: 2 });
  expect(buckets[11]).toMatchObject({ date: "2026-01", income: 0, spending: 4000, net: -4000, count: 1 });
  expect(buckets[0].net).toBe(0);
});

it("keeps zero net months and empty months", () => {
  expect(netBuckets([transaction("2026-01-01", 100), transaction("2026-01-15", -100)], "2026-01-01", "2026-02-28")).toEqual([
    { date: "2026-01", income: 100, spending: 100, net: 0, count: 2 },
    { date: "2026-02", income: 0, spending: 0, net: 0, count: 0 },
  ]);
});
