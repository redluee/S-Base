"use client";

import { useCallback, useEffect, useState } from "react";
import type { FinanceData, FinanceTransactionPage } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { Action, errorText, Notice, panel } from "./ui";

export function Transactions({ data, start, end, subscriptionId, budget = false, title, onClose }: {
  data: FinanceData;
  start: string;
  end: string;
  subscriptionId?: string;
  budget?: boolean;
  title?: string;
  onClose?: () => void;
}) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<FinanceTransactionPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchPage = useCallback(() => subscriptionId
    ? financeApi.subscriptionTransactions(subscriptionId, page)
    : budget ? financeApi.budgetTransactions(end, page)
    : financeApi.transactions(start, end, page), [subscriptionId, budget, start, end, page]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setResult(await fetchPage()); }
    catch (error) { setError(errorText(error)); }
    finally { setLoading(false); }
  }, [fetchPage]);
  useEffect(() => {
    let active = true;
    void fetchPage().then((value) => {
      if (active) { setResult(value); setError(""); setLoading(false); }
    }).catch((error) => {
      if (active) { setError(errorText(error)); setLoading(false); }
    });
    return () => { active = false; };
  }, [fetchPage]);
  return (
    <section className={panel} aria-busy={loading}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title ?? t("finance.transactions")}</h2>
        <p className="text-xs tabular-nums text-muted-foreground">{dateLabel(start)} — {dateLabel(end)}</p>
      </div>
      {onClose && <Action variant="outline" className="mt-3" onClick={onClose}>{t("Sluiten")}</Action>}
      {!subscriptionId && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(budget ? "finance.budget.transactionsHelp" : "finance.transactions.help")}</p>}
      {error && <div className="mt-4"><Notice error>{error}</Notice><Action variant="outline" onClick={() => void load()}>{t("finance.retry")}</Action></div>}
      {loading && <p role="status" className="py-6 text-sm text-muted-foreground">{t("finance.loading")}</p>}
      {!loading && result?.total === 0 && <p className="py-8 text-sm text-muted-foreground">{t("finance.transactions.empty")}</p>}
      <div className="mt-4 divide-y divide-border" inert={loading}>
        {result?.entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
            <div className="min-w-0 flex-1 basis-40">
              <p className="break-words text-sm font-medium">{entry.name || t("finance.transactions.unnamed")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dateLabel(entry.date)} · {data.accounts.find((account) => account.id === entry.accountId)?.name}</p>
              {entry.description && <details className="mt-1 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center">{t("finance.transactions.description")}</summary><p className="max-w-xl whitespace-pre-wrap break-words pb-2 leading-relaxed">{entry.description}</p></details>}
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium tabular-nums ${entry.amountCents > 0 && !entry.internalTransfer ? "text-brand" : "text-foreground"}`}>{entry.amountCents > 0 ? "+" : ""}{money(entry.amountCents)}</p>
              {entry.internalTransfer && <p className="mt-2 text-xs text-muted-foreground">{t("finance.transactions.transfer")}</p>}
            </div>
          </div>
        ))}
      </div>
      {result && result.total > result.pageSize && <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Action variant="outline" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(page - 1); }}>{t("finance.transactions.previous")}</Action>
        <span className="text-xs tabular-nums text-muted-foreground">{page} / {Math.ceil(result.total / result.pageSize)}</span>
        <Action variant="outline" disabled={loading || page * result.pageSize >= result.total} onClick={() => { setLoading(true); setPage(page + 1); }}>{t("finance.transactions.next")}</Action>
      </div>}
    </section>
  );
}
