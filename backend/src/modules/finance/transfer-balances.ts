import type { FinanceAccount, FinanceObservation, FinanceSnapshot } from "../../types/finance";

export function transferAdjustedHistory(
  history: FinanceSnapshot[],
  transfers: { date: string; amountCents: number }[],
): FinanceSnapshot[] {
  if (!transfers.length || !history.length) return history;
  const endDate = history[history.length - 1].date;
  const remaining = transfers.filter((entry) => entry.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  let index = 0;
  let adjustment = 0;
  return [...history].reverse().map((point) => {
    while (index < remaining.length && remaining[index].date > point.date) {
      adjustment += remaining[index++].amountCents;
    }
    return {
      ...point,
      transferAdjustedTotalCents: point.totalCents === null ? null : point.totalCents + adjustment,
    };
  }).reverse();
}

export interface BalanceTransfer {
  accountId: number;
  counterpartyAccountId: number;
  date: string;
  amountCents: number;
}

export function transferBalances(
  accounts: FinanceAccount[],
  observations: FinanceObservation[],
  transfers: BalanceTransfer[],
): FinanceObservation[] {
  const result = [...observations];
  const byAccount = new Map<number, Map<string, number>>();
  for (const transfer of transfers) {
    if (transfer.accountId === transfer.counterpartyAccountId) continue;
    let changes = byAccount.get(transfer.counterpartyAccountId);
    if (!changes) byAccount.set(transfer.counterpartyAccountId, changes = new Map());
    changes.set(transfer.date, (changes.get(transfer.date) ?? 0) - transfer.amountCents);
  }
  for (const account of accounts) {
    const changes = byAccount.get(account.id);
    if (!changes) continue;
    const actual = new Map(observations.filter((entry) => entry.accountId === account.id)
      .map((entry) => [entry.date, entry.balanceCents]));
    const dates = [...new Set([...actual.keys(), ...changes.keys()])].sort();
    let balance: number | null = null;
    for (const date of dates) {
      if (actual.has(date)) balance = actual.get(date)!;
      else if (balance !== null && date >= account.openingDate) {
        balance += changes.get(date) ?? 0;
        result.push({ id: 0, accountId: account.id, date, balanceCents: balance });
      }
    }
  }
  return result;
}
