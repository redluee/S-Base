import type { FinanceSubscriptionCadence, FinanceSubscriptions, FinanceTransaction } from "../../types/finance";
import { createHash } from "node:crypto";

const day = 86_400_000;
const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
const cadences: { cadence: FinanceSubscriptionCadence; days: number; tolerance: number; perYear: number; minimum: number }[] = [
  { cadence: "weekly", days: 7, tolerance: 2, perYear: 52, minimum: 3 },
  { cadence: "fortnightly", days: 14, tolerance: 3, perYear: 26, minimum: 3 },
  { cadence: "fourWeekly", days: 28, tolerance: 2, perYear: 13, minimum: 4 },
  { cadence: "monthly", days: 365.25 / 12, tolerance: 6, perYear: 12, minimum: 2 },
  { cadence: "quarterly", days: 365.25 / 4, tolerance: 8, perYear: 4, minimum: 2 },
  { cadence: "yearly", days: 365.25, tolerance: 15, perYear: 1, minimum: 2 },
];

export function subscriptionSourceKey(entry: Pick<FinanceTransaction, "accountId" | "name">) {
  return createHash("sha256").update(JSON.stringify([entry.accountId, entry.name.trim().replace(/\s+/g, " ").toLowerCase()])).digest("hex");
}

export function detectSubscriptions(transactions: FinanceTransaction[], asOf: string, overrides: ReadonlyMap<string, FinanceSubscriptionCadence> = new Map()): FinanceSubscriptions {
  const groups = new Map<string, FinanceTransaction[]>();
  for (const entry of transactions) {
    if (entry.date > asOf || entry.amountCents >= 0 || entry.internalTransfer) continue;
    const name = entry.name.trim().replace(/\s+/g, " ").toLowerCase();
    if (!name) continue;
    const key = JSON.stringify([entry.accountId, name]);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  const entries: FinanceSubscriptions["entries"] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const override = overrides.get(subscriptionSourceKey(group[0]));
    if (group.length < 2 && !override) continue;
    const gaps = group.slice(1).map((entry, index) => (timestamp(entry.date) - timestamp(group[index].date)) / day);
    const cadence = cadences.find((candidate) => candidate.cadence === override) ?? cadences.find((candidate) => group.length >= candidate.minimum
      && gaps.every((gap) => gap > 0)
      && gaps.filter((gap) => Math.abs(gap - candidate.days) <= candidate.tolerance).length / gaps.length >= 0.8);
    if (!cadence) continue;
    const first = group[0], last = group[group.length - 1];
    const paymentCents = -last.amountCents;
    const id = subscriptionSourceKey(last);
    entries.push({
      id,
      sourceKeys: [id],
      accountIds: [last.accountId],
      accountId: last.accountId,
      name: last.name.trim(),
      cadence: cadence.cadence,
      paymentCents,
      monthlyCents: Math.round(paymentCents * cadence.perYear / 12),
      totalCents: group.reduce((sum, entry) => sum - entry.amountCents, 0),
      paymentCount: group.length,
      firstDate: first.date,
      lastDate: last.date,
      active: (timestamp(asOf) - timestamp(last.date)) / day <= cadence.days + Math.max(7, cadence.tolerance * 2),
    });
  }
  entries.sort((a, b) => Number(b.active) - Number(a.active) || b.monthlyCents - a.monthlyCents || a.name.localeCompare(b.name));
  const dates = transactions.filter((entry) => entry.date <= asOf).map((entry) => entry.date).sort();
  return {
    entries,
    monthlyCents: entries.filter((entry) => entry.active).reduce((sum, entry) => sum + entry.monthlyCents, 0),
    totalCents: entries.reduce((sum, entry) => sum + entry.totalCents, 0),
    asOf,
    lastImportedDate: dates.at(-1) ?? null,
  };
}
