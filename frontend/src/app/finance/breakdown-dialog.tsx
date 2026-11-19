"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { FinanceBreakdown, FinanceBreakdownDirection, FinanceBreakdownGroup, FinanceData } from "@backend/types/finance";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Search, X } from "lucide-react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { dateLabel, money } from "./lib/finance";
import { filterBreakdownGroups, formatIban, sharePercent, shareRatio } from "./lib/finance-breakdown";
import { Action, errorText, Notice } from "./ui";

export function BreakdownDialog({ direction, start, end, data, onClose }: {
  direction: FinanceBreakdownDirection;
  start: string;
  end: string;
  data: FinanceData;
  onClose: () => void;
}) {
  const titleId = useId();
  const [result, setResult] = useState<FinanceBreakdown | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    financeApi.breakdown(direction, start, end)
      .then((value) => { if (active) { setResult(value); setError(""); } })
      .catch((reason) => { if (active) setError(errorText(reason)); });
    return () => { active = false; };
  }, [direction, start, end, attempt]);
  const groups = useMemo(() => filterBreakdownGroups(result?.groups ?? [], query), [result, query]);
  const ranks = useMemo(() => new Map(result?.groups.map((group, index) => [group.key, index + 1])), [result]);
  const income = direction === "income";
  const Icon = income ? ArrowDownLeft : ArrowUpRight;
  const loading = !result && !error;
  return (
    <ModalOverlay open onClose={onClose} label={t(`finance.breakdown.${direction}Title`)} labelledBy={titleId} className="items-end p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-screen flex-col overflow-hidden rounded-t-2xl bg-card ring-1 ring-foreground/10 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out sm:max-h-[85dvh] sm:w-[min(40rem,calc(100vw-2rem))] sm:rounded-2xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0" aria-busy={loading}>
        <header className="border-b border-border px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="grid size-6 place-items-center rounded-full bg-foreground/10"><Icon className={`size-3.5 ${income ? "text-brand" : "text-foreground"}`} aria-hidden="true" /></span>
                <span className="tabular-nums">{dateLabel(start)} — {dateLabel(end)}</span>
              </p>
              <h2 id={titleId} className="mt-3 text-lg font-semibold">{t(`finance.breakdown.${direction}Title`)}</h2>
            </div>
            <Action variant="ghost" className="-mt-2 -mr-2 text-muted-foreground" aria-label={t("finance.breakdown.close")} onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </Action>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-3xl font-medium tracking-tight tabular-nums">{result ? money(result.totalCents) : <span className="inline-block h-9 w-40 animate-pulse rounded-md bg-foreground/10 align-middle" />}</p>
            {result && <p className="text-xs tabular-nums text-muted-foreground">{t("finance.breakdown.summary", { count: String(result.transactionCount), groups: String(result.groups.length) })}</p>}
          </div>
          {result && result.groups.length > 6 && <label className="relative mt-4 block">
            <span className="sr-only">{t("finance.breakdown.search")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("finance.breakdown.search")} className="min-h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-brand" />
          </label>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
          {error && <div className="space-y-3 p-2"><Notice error>{error}</Notice><Action variant="outline" onClick={() => { setError(""); setAttempt(attempt + 1); }}>{t("finance.retry")}</Action></div>}
          {loading && <ul aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <li key={index} className="flex items-center gap-3 px-2 py-4 sm:px-3">
            <span className="h-4 w-5 animate-pulse rounded bg-foreground/10" />
            <span className="h-4 flex-1 animate-pulse rounded bg-foreground/10" style={{ maxWidth: `${70 - index * 9}%` }} />
            <span className="ml-auto h-4 w-20 animate-pulse rounded bg-foreground/10" />
          </li>)}</ul>}
          {result && result.groups.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t(`finance.breakdown.${direction}Empty`)}</p>}
          {result && result.groups.length > 0 && groups.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("finance.breakdown.noMatch")}</p>}
          {result && groups.length > 0 && <ol>
            {groups.map((group) => <BreakdownRow key={group.key} group={group} rank={ranks.get(group.key) ?? 0} totalCents={result.totalCents} income={income} data={data} open={expanded === group.key} onToggle={() => setExpanded(expanded === group.key ? null : group.key)} />)}
          </ol>}
        </div>
        <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">{t("finance.breakdown.help")}</p>
      </div>
    </ModalOverlay>
  );
}

function BreakdownRow({ group, rank, totalCents, income, data, open, onToggle }: {
  group: FinanceBreakdownGroup;
  rank: number;
  totalCents: number;
  income: boolean;
  data: FinanceData;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const iban = formatIban(group.iban);
  const share = sharePercent(group.totalCents, totalCents);
  return (
    <li className="rounded-xl transition-colors has-[button:hover]:bg-accent/60 data-[open=true]:bg-accent/40" data-open={open}>
      <button type="button" className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-3.5 text-left transition-transform focus-visible:outline-2 focus-visible:outline-brand active:scale-[0.995] sm:px-3" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="w-5 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">{rank}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">{group.name || t("finance.breakdown.unnamed")}</span>
            <span className={`shrink-0 text-sm font-medium tabular-nums ${income ? "text-brand" : "text-foreground"}`}>{money(group.totalCents)}</span>
          </span>
          <span className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate tabular-nums">{[iban, t("finance.breakdown.payments", { count: String(group.count) })].filter(Boolean).join(" · ")}</span>
            <span className="shrink-0 tabular-nums">{t("finance.breakdown.share", { percent: share })}</span>
          </span>
          <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
            <span className={`block h-full origin-left rounded-full transition-transform duration-500 ease-out ${income ? "bg-brand" : "bg-foreground/70"}`} style={{ transform: `scaleX(${shareRatio(group.totalCents, totalCents)})` }} />
          </span>
        </span>
        <ChevronDown className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div id={panelId} className="pr-3 pb-3 pl-10 animate-in fade-in slide-in-from-top-1 duration-200 sm:pr-10 sm:pl-11">
        <ul className="divide-y divide-border border-t border-border">
          {group.transactions.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 text-xs">
            <span className="min-w-0">
              <span className="block tabular-nums text-foreground">{dateLabel(entry.date)} <span className="text-muted-foreground">· {data.accounts.find((account) => account.id === entry.accountId)?.name}</span></span>
              {entry.description && <span className="mt-0.5 line-clamp-2 break-words text-muted-foreground">{entry.description}</span>}
            </span>
            <span className="shrink-0 tabular-nums">{money(entry.amountCents)}</span>
          </li>)}
        </ul>
        {group.count > group.transactions.length && <p className="pt-2 text-xs text-muted-foreground">{t("finance.breakdown.recent", { shown: String(group.transactions.length), count: String(group.count) })}</p>}
      </div>}
    </li>
  );
}
