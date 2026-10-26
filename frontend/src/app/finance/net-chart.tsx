"use client";

import { useEffect, useMemo, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import { dateLabel, money } from "@/lib/finance";
import { loadHistoryTransactions } from "@/lib/finance-history-transactions";
import { netBuckets, netRange } from "@/lib/finance-net";
import { financeChartScale } from "@/lib/finance-chart-scale";
import type { FinanceTransaction } from "@backend/types/finance";
import { t } from "@/lib/lang";
import { Action, errorText, Notice, panel } from "./ui";

export function NetChart({ end }: { end: string }) {
  const [result, setResult] = useState<{ key: string; entries: FinanceTransaction[] } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const range = netRange(end);
  const key = `${range.start}/${end}`;
  useEffect(() => {
    let cancelled = false;
    void loadHistoryTransactions(range.start, end, financeApi.transactions, () => cancelled)
      .then((entries) => {
        if (!cancelled) {
          setResult({ key, entries });
          setFailure(null);
        }
      })
      .catch((error) => { if (!cancelled) setFailure({ key, message: errorText(error) }); });
    return () => { cancelled = true; };
  }, [range.start, end, key, retry]);
  const ready = result?.key === key;
  const error = failure?.key === key ? failure.message : "";
  const buckets = useMemo(() => netBuckets(ready ? result.entries : [], range.start, end), [ready, result, range.start, end]);
  const { lower, upper, ticks } = financeChartScale(buckets.map((bucket) => bucket.net));
  const y = (value: number) => 5 + (upper - value) / (upper - lower) * 90;
  const zero = y(0);
  const axisWidth = Math.max(...ticks.map((value) => (value / 100).toLocaleString("nl-NL").length)) + 2;
  const label = (date: string) => new Date(`${date}-01T12:00:00Z`).toLocaleDateString("nl-NL", { month: "short", year: "2-digit", timeZone: "UTC" });
  return <section className={panel} aria-label={t("finance.netChart")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{t("finance.netChart")}</h2>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{dateLabel(range.start)} – {dateLabel(end)}</p>
    {error ? <div className="mt-4 space-y-2"><Notice error>{error}</Notice><Action variant="outline" onClick={() => { setFailure(null); setRetry((value) => value + 1); }}>{t("finance.retry")}</Action></div> : !ready ? <p role="status" className="mt-4 text-sm text-muted-foreground">{t("finance.loading")}</p> : <>
      {!buckets.some((bucket) => bucket.count) && <div className="mt-4"><Notice>{t("finance.activity.empty")}</Notice></div>}
      <div className="mt-6 overflow-x-auto pb-2 text-xs" style={{ paddingLeft: `${axisWidth}ch` }}>
        <div className="relative flex pt-24" style={{ minWidth: buckets.length * 44 }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 h-64">
            {ticks.map((value) => <div key={value} className={`absolute inset-x-0 border-t ${value === 0 ? "border-foreground/40" : "border-border"}`} style={{ top: `${y(value)}%` }}>
              <span className="absolute right-full -translate-y-1/2 pr-1 text-[9px] tabular-nums text-muted-foreground sm:pr-2 sm:text-[10px]">{(value / 100).toLocaleString("nl-NL")}</span>
            </div>)}
          </div>
          {buckets.map((bucket, index) => <div key={bucket.date} className="group relative min-w-0 flex-1">
            <button type="button" aria-label={`${label(bucket.date)}: ${money(bucket.net)}`} className="relative block h-64 w-full cursor-crosshair rounded-sm focus-visible:outline-2 focus-visible:outline-brand">
              <span aria-hidden="true" className={`absolute inset-x-[20%] ${bucket.net > 0 ? "rounded-t-sm bg-brand" : bucket.net < 0 ? "rounded-b-sm bg-destructive" : "bg-muted-foreground"}`} style={{ top: `${Math.min(y(bucket.net), zero)}%`, height: bucket.net === 0 ? 2 : `${Math.abs(y(bucket.net) - zero)}%` }} />
            </button>
            <div role="tooltip" className={`pointer-events-none absolute top-0 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg border border-border bg-popover p-3 text-xs tabular-nums group-hover:block group-focus-within:block ${index > buckets.length / 2 ? "right-0" : "left-0"}`}>
              <p className="mb-1 font-medium">{label(bucket.date)}</p>
              <p>{t("finance.income")}: {money(bucket.income)}</p>
              <p>{t("finance.spending")}: {money(bucket.spending)}</p>
              <p className={bucket.net < 0 ? "text-destructive" : "text-brand"}>{t("finance.net")}: {money(bucket.net)}</p>
            </div>
            <p className="mt-3 text-center text-[9px] leading-tight text-muted-foreground sm:text-[10px]">{label(bucket.date)}</p>
          </div>)}
        </div>
      </div>
      <details className="mt-5 border-t border-border pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">{t("finance.chartValues")}</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead><tr>{["date", "income", "spending", "net"].map((column) => <th key={column} className="px-2 py-3">{t(`finance.${column}`)}</th>)}</tr></thead>
            <tbody>{buckets.map((bucket) => <tr key={bucket.date} className="border-t border-border"><td className="px-2 py-3">{label(bucket.date)}</td><td className="px-2">{money(bucket.income)}</td><td className="px-2">{money(bucket.spending)}</td><td className={`px-2 ${bucket.net < 0 ? "text-destructive" : "text-brand"}`}>{money(bucket.net)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </>}
  </section>;
}
