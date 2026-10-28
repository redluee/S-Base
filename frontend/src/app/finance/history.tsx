"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { FinanceDashboard, FinanceData, FinanceTransaction } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { historyTransactionsByDate, loadHistoryTransactions } from "@/lib/finance-history-transactions";
import { dateLabel, financeAccountLabel, money } from "@/lib/finance";
import {
  closestHistoryIndex,
  financeHistoryGeometry,
  financeHistoryPoints,
} from "@/lib/finance-history";
import { t } from "@/lib/lang";
import { HistoryRow } from "./history-row";
import { Action, errorText, Notice, selectClass } from "./ui";
import styles from "./history.module.css";

export function History({
  report,
  data,
}: {
  report: FinanceDashboard;
  data: FinanceData;
}) {
  const [series, setSeries] = useState("total");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transactions, setTransactions] = useState<{
    start: string;
    end: string;
    entries: FinanceTransaction[];
  } | null>(null);
  const [transactionFailure, setTransactionFailure] = useState<{ start: string; end: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const valuesRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const pendingPosition = useRef<number | null>(null);
  const pointerFrame = useRef<number | null>(null);
  const titleId = useId();
  const fillId = useId();
  useEffect(() => {
    if (!detailsOpen) return;
    let cancelled = false;
    void loadHistoryTransactions(report.startDate, report.endDate, financeApi.transactions, () => cancelled)
      .then((entries) => {
        if (!cancelled) {
          setTransactions({ start: report.startDate, end: report.endDate, entries });
          setTransactionFailure(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setTransactionFailure({ start: report.startDate, end: report.endDate, message: errorText(error) });
      });
    return () => { cancelled = true; };
  }, [detailsOpen, report.startDate, report.endDate, retry]);
  const transactionError = transactionFailure?.start === report.startDate && transactionFailure?.end === report.endDate ? transactionFailure.message : "";
  const transactionsLoaded = transactions?.start === report.startDate && transactions?.end === report.endDate;
  const points = useMemo(() => financeHistoryPoints(report.history, series), [report.history, series]);
  const chartAccounts = useMemo(() => [
    ...data.accounts,
    ...report.end.accounts.filter((account) => account.inferred),
  ], [data.accounts, report.end.accounts]);
  const chart = useMemo(() => financeHistoryGeometry(
    points,
    false,
    report.startDate,
    report.endDate,
  ), [points, report.startDate, report.endDate]);
  const positions = useMemo(() => points.map((point) => chart.x(point.date)), [points, chart]);
  const dateIndices = useMemo(() => new Map(points.map((point, index) => [point.date, index])), [points]);
  const selectedIndex = selectedDate
    ? (dateIndices.get(selectedDate) ?? -1)
    : -1;
  const index = selectedIndex >= 0 ? selectedIndex : points.length - 1;
  const selected = points[index];
  useEffect(() => {
    const list = valuesRef.current;
    const row = selectedRowRef.current;
    if (!detailsOpen || !list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop || bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - (list.clientHeight - row.offsetHeight) / 2;
    }
  }, [index, series, detailsOpen, transactions]);
  const selectedAccount = chartAccounts.find((account) => account.id === Number(series));
  const mainLabel =
    series === "total"
      ? t("finance.totalChartSeries")
      : series === "savings"
        ? t("finance.savingsTotal")
        : selectedAccount ? financeAccountLabel(selectedAccount) : t("finance.balance");
  const title = t("finance.progression");
  const selectedIds = useMemo(() =>
    series === "total"
      ? data.accounts.map((account) => account.id)
      : series === "savings"
        ? data.accounts
          .filter((account) => account.type === "savings")
          .map((account) => account.id)
        : [Number(series)], [series, data.accounts]);
  const transactionsByDate = useMemo(() => historyTransactionsByDate(transactionsLoaded ? transactions.entries : [], selectedIds), [transactionsLoaded, transactions, selectedIds]);
  const observedDates = useMemo(() => new Set(
    data.observations
      .filter(
        (observation) =>
          selectedIds.includes(observation.accountId) &&
          observation.date <= report.endDate,
      )
      .map((observation) => observation.date),
  ), [data.observations, selectedIds, report.endDate]);
  useEffect(() => () => {
    if (pointerFrame.current !== null) {
      cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = null;
    }
  }, [points, positions]);
  function selectPoint(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * 600;
    pendingPosition.current = position;
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const closest = closestHistoryIndex(positions, pendingPosition.current!);
      if (closest >= 0) setSelectedDate(points[closest].date);
    });
  }
  return (
    <section className="py-4 sm:rounded-xl sm:bg-card sm:p-6 sm:ring-1 sm:ring-foreground/10" aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
        </div>
        <label className="flex shrink-0 flex-col gap-1 text-xs text-muted-foreground sm:w-64">
          {t("finance.historySeries")}
          <select
            className={selectClass}
            value={series}
            onChange={(event) => setSeries(event.target.value)}
          >
            <option value="total">{t("finance.totalChartSeries")}</option>
            <option value="savings">{t("finance.savingsTotal")}</option>
            {chartAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {financeAccountLabel(account)}
                {account.archived ? ` · ${t("finance.archived")}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected && (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 tabular-nums" aria-live="polite" aria-atomic="true">
          <p className="text-xl font-medium tracking-tight">
            {selected.value === null ? t("finance.unknown") : money(selected.value)}
          </p>
          <p className="text-xs text-muted-foreground">{dateLabel(selected.date)}</p>
        </div>
      )}
      {observedDates.size < 2 && (
        <div className="mt-4">
          <Notice>{t("finance.insufficientHistory")}</Notice>
        </div>
      )}
      {chart.hasValues ? (
        <div className="mt-5">
          <div className={`${styles.plot} relative sm:pl-20`}>
            <div aria-hidden="true" className={`${styles.axis} pointer-events-none absolute inset-y-0 left-0 z-10 text-[10px] tabular-nums text-muted-foreground sm:w-16 sm:text-right sm:text-xs`}>
              {chart.ticks.map((value) => (
                <span key={value} className={`${styles.tick} absolute -translate-y-1/2 sm:right-0`} style={{ top: `${chart.y(value) / 210 * 100}%` }}>
                  {new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(value / 100)}
                </span>
              ))}
            </div>
            <svg
              role="img"
              aria-label={title}
              viewBox="0 0 600 210"
              preserveAspectRatio="none"
              className={`${styles.graph} h-56 cursor-crosshair touch-pan-y overflow-visible sm:h-64 sm:w-full`}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const next = Math.max(
                  0,
                  Math.min(points.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)),
                );
                if (points[next]) setSelectedDate(points[next].date);
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                selectPoint(event);
              }}
              onPointerMove={(event) => {
                if (event.pointerType === "mouse" || event.currentTarget.hasPointerCapture(event.pointerId)) selectPoint(event);
              }}
            >
              <title>{title}</title>
              <desc>
                {t("finance.chartHelp")}
              </desc>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e3a4" stopOpacity="0.18" />
                  <stop offset="65%" stopColor="#00e3a4" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#00e3a4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={chart.totalAreaPath} fill={`url(#${fillId})`} aria-hidden="true" />
              {chart.ticks.map((value) => (
                <line
                  key={value}
                  x1="0"
                  x2="600"
                  y1={chart.y(value)}
                  y2={chart.y(value)}
                  stroke="currentColor"
                  opacity={value === 0 ? "0.45" : "0.1"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path
                d={chart.totalPath}
                fill="none"
                stroke="#00e3a4"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              {selected && (
                <>
                  <line
                    x1={chart.x(selected.date)}
                    x2={chart.x(selected.date)}
                    y1="12"
                    y2="198"
                    stroke="currentColor"
                    opacity="0.25"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  {selected.value !== null && (
                    <circle
                      cx={chart.x(selected.date)}
                      cy={chart.y(selected.value)}
                      r="4"
                      fill="#00e3a4"
                    />
                  )}
                </>
              )}
            </svg>
          </div>
          <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground sm:pl-20">
            <span>{dateLabel(report.startDate)}</span>
            <span>{dateLabel(report.endDate)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Notice>{t("finance.noHistory")}</Notice>
        </div>
      )}
      <details className="mt-5 border-t border-border pt-2" onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">
          {t("finance.chartValues")}
        </summary>
        <p className="my-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t("finance.chartHelp")}</p>
        {points.length > 1 && (
          <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            {t("finance.inspectHistory")}
            <input
              type="range"
              min={0}
              max={points.length - 1}
              step={1}
              value={index}
              aria-valuetext={t("finance.historyPointValue", {
                date: dateLabel(selected.date),
                amount: money(selected.value),
              })}
              onChange={(event) =>
                setSelectedDate(points[Number(event.target.value)].date)
              }
              className="h-11 w-full cursor-pointer accent-brand"
            />
          </label>
        )}
        {transactionError && <div className="my-3 space-y-2"><Notice error>{transactionError}</Notice><Action variant="outline" onClick={() => { setTransactionFailure(null); setRetry((value) => value + 1); }}>{t("finance.retry")}</Action></div>}
        <div ref={valuesRef} className="relative max-h-72 overflow-auto overscroll-contain">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-3 pr-3">{t("finance.date")}</th>
                <th className="pr-3">{mainLabel}</th>

                <th className="min-w-40 py-3 pr-3">{t("finance.transactions")}</th>
                <th className="text-right">{t("finance.coverage")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <HistoryRow
                  key={point.date}
                  point={point}
                  selected={point.date === selected?.date}
                  rowRef={point.date === selected?.date ? selectedRowRef : undefined}
                  entries={transactionsByDate.get(point.date)}
                  loaded={transactionsLoaded}
                  failed={!!transactionError}
                />
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
