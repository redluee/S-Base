"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { FinanceData, FinanceSubscriptionCadence, FinanceTransaction, FinanceTransactionPage } from "@backend/types/finance";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { financeApi } from "@/lib/api/finance";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { Action, Field, Notice, errorText, panel, selectClass } from "./ui";

export function AddSubscription({ data, onClose, onSaved }: { data: FinanceData; onClose: () => void; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<FinanceTransactionPage | null>(null);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);
  const [cadence, setCadence] = useState<FinanceSubscriptionCadence>("monthly");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void financeApi.subscriptionCandidates(search, page).then((value) => {
        if (active) { setResult(value); setLoading(false); }
      }).catch((error) => {
        if (active) { setError(errorText(error)); setLoading(false); }
      });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, retry]);
  function changePage(value: number) { setPage(value); setLoading(true); setError(""); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await financeApi.addSubscription(selected.id, cadence);
      await onSaved();
      onClose();
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  return <ModalOverlay open onClose={() => { if (!busy) onClose(); }} label={t("finance.subscriptions.add")}>
    <form onSubmit={submit} aria-busy={busy} className={`${panel} flex max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto`}>
      <h2 className="text-lg font-semibold">{t("finance.subscriptions.add")}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("finance.subscriptions.addHelp")}</p>
      <Field label={t("finance.subscriptions.search")} value={search} autoFocus disabled={busy} onChange={(event) => { setSearch(event.target.value); changePage(1); }} />
      {loading ? <p role="status" className="text-sm text-muted-foreground">{t("finance.loading")}</p> : <>
        <fieldset disabled={busy} className="min-w-0 divide-y divide-border">
          <legend className="sr-only">{t("finance.subscriptions.selectTransaction")}</legend>
          {result?.entries.map((entry) => <label key={entry.id} className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
            <input type="radio" name="transaction" className="mt-1 size-5 shrink-0 accent-brand" checked={selected?.id === entry.id} onChange={() => setSelected(entry)} />
            <span className="min-w-0 flex-1 text-sm"><span className="block break-words font-medium">{entry.name}</span><span className="mt-1 block text-xs text-muted-foreground">{dateLabel(entry.date)} · {data.accounts.find((account) => account.id === entry.accountId)?.name}</span>{entry.description && <span className="mt-1 block break-words text-xs text-muted-foreground">{entry.description}</span>}</span>
            <span className="shrink-0 text-sm tabular-nums">{money(entry.amountCents)}</span>
          </label>)}
        </fieldset>
        {result?.total === 0 && <p className="text-sm text-muted-foreground">{t("finance.subscriptions.noCandidates")}</p>}
        {result && result.total > result.pageSize && <div className="flex items-center justify-between gap-2">
          <Action type="button" variant="outline" disabled={busy || page === 1} onClick={() => changePage(page - 1)}>{t("finance.transactions.previous")}</Action>
          <span className="text-xs tabular-nums">{page} / {Math.ceil(result.total / result.pageSize)}</span>
          <Action type="button" variant="outline" disabled={busy || page * result.pageSize >= result.total} onClick={() => changePage(page + 1)}>{t("finance.transactions.next")}</Action>
        </div>}
      </>}
      {selected && <p className="break-words text-sm">{t("finance.subscriptions.selected", { name: selected.name })} · {dateLabel(selected.date)} · {money(selected.amountCents)}</p>}
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">{t("finance.subscriptions.cadence")}
        <select className={selectClass} value={cadence} disabled={busy} onChange={(event) => setCadence(event.target.value as FinanceSubscriptionCadence)}>
          {(["weekly", "fortnightly", "fourWeekly", "monthly", "quarterly", "yearly", "irregular"] as const).map((value) => <option key={value} value={value}>{t(`finance.subscriptions.${value}`)}</option>)}
        </select>
      </label>
      {cadence === "irregular" && <p className="text-sm leading-relaxed text-muted-foreground">{t("finance.subscriptions.irregularHelp")}</p>}
      {error && <><Notice error>{error}</Notice><Action type="button" variant="outline" disabled={busy} onClick={() => { setLoading(true); setError(""); setRetry(retry + 1); }}>{t("finance.retry")}</Action></>}
      <div className="flex flex-wrap justify-end gap-2">
        <Action type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancel")}</Action>
        <Action type="submit" disabled={busy || !selected}>{t(busy ? "Saving..." : "finance.subscriptions.add")}</Action>
      </div>
    </form>
  </ModalOverlay>;
}
