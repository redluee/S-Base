import { ValidationError } from "../../utils/errors";
import type { FinanceBreakdown, FinanceBreakdownDirection, FinanceBreakdownGroup } from "../../types/finance";
import type { FinanceTransactions } from "./transactions";
import { calendarDate, today } from "./validation";

const RECENT_LIMIT = 25;

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export class FinanceBreakdowns {
  constructor(private readonly transactions: FinanceTransactions) {}
  breakdown(userId: number, input: Record<string, unknown>): FinanceBreakdown {
    const direction = input.direction;
    if (direction !== "income" && direction !== "spending")
      throw new ValidationError("finance.breakdown.invalidDirection");
    const startDate = calendarDate(input.start ?? "1900-01-01");
    const endDate = calendarDate(input.end ?? today());
    if (startDate > endDate) throw new ValidationError("finance.transactions.invalidFilter");
    return this.group(direction, startDate, endDate, userId);
  }
  private group(
    direction: FinanceBreakdownDirection,
    startDate: string,
    endDate: string,
    userId: number,
  ): FinanceBreakdown {
    const groups = new Map<string, FinanceBreakdownGroup>();
    let totalCents = 0;
    let transactionCount = 0;
    for (const entry of this.transactions.counterpartyTransactions(userId, startDate, endDate)) {
      if (entry.internalTransfer) continue;
      if (direction === "income" ? entry.amountCents <= 0 : entry.amountCents >= 0) continue;
      const amountCents = Math.abs(entry.amountCents);
      const name = normalizedName(entry.name);
      const key = entry.counterpartyIdentity !== "unidentified" ? `iban:${entry.counterpartyIdentity}` : `name:${name}`;
      const group = groups.get(key) ?? {
        key,
        name: entry.name.trim(),
        iban: entry.counterparty,
        totalCents: 0,
        count: 0,
        lastDate: entry.date,
        transactions: [],
      };
      group.totalCents += amountCents;
      group.count++;
      if (!group.name && entry.name.trim()) group.name = entry.name.trim();
      if (!group.iban && entry.counterparty) group.iban = entry.counterparty;
      if (group.transactions.length < RECENT_LIMIT)
        group.transactions.push({
          id: entry.id,
          accountId: entry.accountId,
          date: entry.date,
          amountCents,
          name: entry.name,
          description: entry.description,
        });
      groups.set(key, group);
      totalCents += amountCents;
      transactionCount++;
    }
    return {
      direction,
      startDate,
      endDate,
      totalCents,
      transactionCount,
      groups: [...groups.values()].sort(
        (a, b) => b.totalCents - a.totalCents || b.count - a.count || a.name.localeCompare(b.name),
      ),
    };
  }
}
