import { createHash } from "node:crypto";
import type { FinanceBalanceAccount, FinanceData, FinanceObservation } from "../../types/finance";
import { transferBalances } from "./transfer-balances";

export interface AccountTransfer {
  accountId: number;
  counterpartyAccountId?: number;
  counterpartyIdentity: string;
  savings: boolean;
  date: string;
  amountCents: number;
}

export function inferredBalances(data: FinanceData, transfers: AccountTransfer[]) {
  const accounts: FinanceBalanceAccount[] = [...data.accounts];
  const observations = transferBalances(data.accounts, data.observations, transfers
    .filter((entry) => entry.counterpartyAccountId !== undefined)
    .map((entry) => ({ ...entry, counterpartyAccountId: entry.counterpartyAccountId! })));
  const openingDate = data.accounts.map((account) => account.openingDate).sort()[0];
  if (!openingDate) return { accounts, observations };
  const groups = new Map<string, { savings: boolean; changes: Map<string, number> }>();
  for (const transfer of transfers) {
    if (transfer.counterpartyAccountId !== undefined) continue;
    let group = groups.get(transfer.counterpartyIdentity);
    if (!group) {
      group = { savings: transfer.savings, changes: new Map() };
      groups.set(transfer.counterpartyIdentity, group);
    }
    group.savings ||= transfer.savings;
    group.changes.set(transfer.date, (group.changes.get(transfer.date) ?? 0) - transfer.amountCents);
  }
  for (const [identity, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const id = -Number.parseInt(createHash("sha256").update(identity).digest("hex").slice(0, 12), 16) - 1;
    const changes = [...group.changes].sort(([a], [b]) => a.localeCompare(b));
    let net = 0, minimum = 0;
    for (const [, delta] of changes) {
      net += delta;
      minimum = Math.min(minimum, net);
    }
    accounts.push({
      id, name: String(accounts.filter((account) => account.inferred).length + 1), bank: null,
      type: group.savings ? "savings" : "untracked", openingDate, archived: false, inferred: true,
    });
    let balance = -minimum;
    const daily = new Map<string, FinanceObservation>();
    daily.set(openingDate, { id: 0, accountId: id, date: openingDate, balanceCents: balance });
    for (const [date, delta] of changes) {
      balance += delta;
      daily.set(date, { id: 0, accountId: id, date, balanceCents: balance });
    }
    observations.push(...daily.values());
  }
  return { accounts, observations };
}
