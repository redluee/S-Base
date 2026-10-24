import type { FinanceTransaction } from "@backend/types/finance";

export type NetPeriod = "month" | "year";
export function netRange(end: string, period: NetPeriod) {
  const date = new Date(`${end}T12:00:00Z`);
  if (period === "year") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 11);
  } else date.setUTCDate(date.getUTCDate() - 29);
  return { start: date.toISOString().slice(0, 10), end };
}

export function netBuckets(entries: FinanceTransaction[], start: string, end: string, period: NetPeriod) {
  const buckets = new Map<string, { date: string; income: number; spending: number; net: number; count: number }>();
  const date = new Date(`${start}T12:00:00Z`);
  while (date.toISOString().slice(0, 10) <= end) {
    const key = date.toISOString().slice(0, period === "year" ? 7 : 10);
    buckets.set(key, { date: key, income: 0, spending: 0, net: 0, count: 0 });
    if (period === "year") date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
  }
  for (const entry of entries) {
    if (entry.internalTransfer || entry.date < start || entry.date > end) continue;
    const bucket = buckets.get(entry.date.slice(0, period === "year" ? 7 : 10));
    if (!bucket) continue;
    bucket.net += entry.amountCents;
    bucket.income += Math.max(0, entry.amountCents);
    bucket.spending += Math.max(0, -entry.amountCents);
    bucket.count++;
  }
  return [...buckets.values()];
}
