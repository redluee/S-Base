import { ValidationError } from "../../utils/errors";
import type { FinanceBreakdown, FinanceBreakdownDirection, FinanceBreakdownGroup } from "../../types/finance";
import { payeeClusters, payeeName } from "./breakdown-names";
import { accountNumberKey, type FinanceTransactions } from "./transactions";
import { calendarDate, today } from "./validation";

const RECENT_LIMIT = 25;

const DESCRIPTION_IBAN = /\bIBAN:\s*([A-Z]{2}\d{2}[A-Z0-9]{4,30})\b/i;

function counterpartyIban(counterparty: string | null, description: string) {
  if (counterparty) return counterparty;
  return DESCRIPTION_IBAN.exec(description)?.[1].toUpperCase() ?? null;
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
    const entries = this.transactions
      .counterpartyTransactions(userId, startDate, endDate)
      .filter(
        (entry) => !entry.internalTransfer && (direction === "income" ? entry.amountCents > 0 : entry.amountCents < 0),
      )
      .map((entry) => {
        const iban = counterpartyIban(entry.counterparty, entry.description);
        const identity = iban
          ? accountNumberKey(userId, iban)
          : entry.counterpartyIdentity !== "unidentified"
            ? entry.counterpartyIdentity
            : null;
        return { ...entry, iban, identity, payee: payeeName(entry.name) };
      });
    const payeesByIdentity = new Map<string, string[]>();
    for (const entry of entries)
      if (entry.identity)
        payeesByIdentity.set(entry.identity, [...(payeesByIdentity.get(entry.identity) ?? []), entry.payee]);
    const clusters = new Map([...payeesByIdentity].map(([identity, payees]) => [identity, payeeClusters(payees)]));
    const clusterKey = (identity: string, payee: string) => `iban:${identity}:${clusters.get(identity)?.get(payee)}`;
    const keysByPayee = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (!entry.identity) continue;
      const keys = keysByPayee.get(entry.payee) ?? new Set<string>();
      keys.add(clusterKey(entry.identity, entry.payee));
      keysByPayee.set(entry.payee, keys);
    }
    const groups = new Map<string, FinanceBreakdownGroup>();
    let totalCents = 0;
    let transactionCount = 0;
    for (const entry of entries) {
      const namesake = keysByPayee.get(entry.payee);
      const key = entry.identity
        ? clusterKey(entry.identity, entry.payee)
        : namesake?.size === 1
          ? [...namesake][0]
          : `name:${entry.payee}`;
      const amountCents = Math.abs(entry.amountCents);
      const group = groups.get(key) ?? {
        key,
        name: entry.name.trim(),
        iban: entry.iban,
        totalCents: 0,
        count: 0,
        lastDate: entry.date,
        transactions: [],
      };
      group.totalCents += amountCents;
      group.count++;
      if (!group.name && entry.name.trim()) group.name = entry.name.trim();
      if (!group.iban && entry.iban) group.iban = entry.iban;
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
