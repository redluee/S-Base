import type { FinanceTransaction, FinanceTransactionPage } from "@backend/types/finance";

export async function loadHistoryTransactions(
  start: string,
  end: string,
  loadPage: (start: string, end: string, page: number) => Promise<FinanceTransactionPage>,
  cancelled: () => boolean,
): Promise<FinanceTransaction[]> {
  const entries: FinanceTransaction[] = [];
  let page = 1;
  while (!cancelled()) {
    const result = await loadPage(start, end, page);
    if (cancelled()) return [];
    entries.push(...result.entries);
    if (page * result.pageSize >= result.total || result.entries.length === 0) break;
    page++;
  }
  return entries;
}

export function historyTransactionsByDate(entries: FinanceTransaction[], accountIds: number[]) {
  const accounts = new Set(accountIds);
  const dates = new Map<string, FinanceTransaction[]>();
  for (const entry of entries) {
    if (!accounts.has(entry.accountId)) continue;
    const group = dates.get(entry.date) ?? [];
    group.push(entry);
    dates.set(entry.date, group);
  }
  return dates;
}
