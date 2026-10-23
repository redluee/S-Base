"use client";

import { useId, useState, type PointerEvent } from "react";
import type { FinanceDashboard, FinanceData } from "@backend/types/finance";
import { dateLabel, money } from "@/lib/finance";
import {
  financeHistoryGeometry,
  financeHistoryPoints,
} from "@/lib/finance-history";
import { t } from "@/lib/lang";
import { Notice, panel, selectClass } from "./ui";

export function History({
  report,
  data,
}: {
  report: FinanceDashboard;
  data: FinanceData;
}) {
  const [series, setSeries] = useState("total");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const titleId = useId();
  const points = financeHistoryPoints(report.history, series);
  const showSavings =
    series === "total" &&
    report.end.accounts.some((account) => account.type === "savings");
  const chart = financeHistoryGeometry(
    points,
    showSavings,
    report.startDate,
    report.endDate,
  );
  const selectedIndex = selectedDate
    ? points.findIndex((point) => point.date === selectedDate)
    : -1;
  const index = selectedIndex >= 0 ? selectedIndex : points.length - 1;
  const selected = points[index];
  const mainLabel =
    series === "total"
      ? t("finance.totalChartSeries")
      : series === "savings"
        ? t("finance.savingsTotal")
        : (data.accounts.find((account) => account.id === Number(series))
            ?.name ?? t("finance.balance"));
  const title =
    series === "total"
      ? t("finance.totalChartTitle")
      : t("finance.progression");
  const selectedIds =
    series === "total"
      ? data.accounts.map((account) => account.id)
      : series === "savings"
        ? data.accounts
            .filter((account) => account.type === "savings")
            .map((account) => account.id)
        : [Number(series)];
  const observedDates = new Set(
    data.observations
      .filter(
        (observation) =>
          selectedIds.includes(observation.accountId) &&
          observation.date <= report.endDate,
      )
      .map((observation) => observation.date),
  );
  function selectPoint(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * 600;
    const closest = points.reduce(
      (previous, point) =>
        Math.abs(chart.x(point.date) - position) <
        Math.abs(chart.x(previous.date) - position)
          ? point
          : previous,
      points[0],
    );
    if (closest) setSelectedDate(closest.date);
  }
  return (
    <section className={panel} aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {series === "total" && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("finance.totalChartSubtitle")}
            </p>
          )}
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
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.archived ? ` · ${t("finance.archived")}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected && (
        <div className="mt-5" aria-live="polite" aria-atomic="true">
          <p className="text-xs tabular-nums text-muted-foreground">
            {dateLabel(selected.date)} ·{" "}
            {t("finance.coverageCount", {
              known: String(selected.known),
              total: String(selected.expected),
            })}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-6 shrink-0 bg-brand"
                />
                {mainLabel}
              </p>
              <p className="mt-2 break-words text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
                {money(selected.value)}
              </p>
            </div>
            {showSavings && (
              <div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="w-6 border-t-2 border-dashed border-zinc-400"
                  />
                  {t("finance.savingsIncluded")}
                </p>
                <p className="mt-2 text-xl tabular-nums text-zinc-300">
                  {money(selected.savingsValue)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {observedDates.size < 2 && (
        <div className="mt-4">
          <Notice>{t("finance.insufficientHistory")}</Notice>
        </div>
      )}
      {chart.hasValues ? (
        <div className="mt-5">
          <div className="flex flex-wrap justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>
              {t(series === "total" ? "finance.lowestTotal" : "finance.lowest")}
              : {money(chart.seriesMin)}
            </span>
            <span>
              {t(
                series === "total" ? "finance.highestTotal" : "finance.highest",
              )}
              : {money(chart.seriesMax)}
            </span>
          </div>
          <svg
            role="img"
            aria-label={title}
            viewBox="0 0 600 210"
            preserveAspectRatio="none"
            className="mt-2 h-56 w-full overflow-visible sm:h-64"
            onPointerDown={selectPoint}
            onPointerMove={(event) => {
              if (event.pointerType === "mouse") selectPoint(event);
            }}
          >
            <title>{title}</title>
            <desc>
              {t("finance.chartHelp")}
              {showSavings ? ` ${t("finance.savingsIncludedHelp")}` : ""}
            </desc>
            {[20, 105, 190].map((position) => (
              <line
                key={position}
                x1="0"
                x2="600"
                y1={position}
                y2={position}
                stroke="currentColor"
                opacity="0.1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {showSavings && (
              <path
                d={chart.savingsPath}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="2"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
            )}
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
                {showSavings && selected.savingsValue !== null && (
                  <circle
                    cx={chart.x(selected.date)}
                    cy={chart.y(selected.savingsValue)}
                    r="3"
                    fill="#a1a1aa"
                  />
                )}
              </>
            )}
          </svg>
          <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>{dateLabel(report.startDate)}</span>
            <span>{dateLabel(report.endDate)}</span>
          </div>
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
        </div>
      ) : (
        <div className="mt-5">
          <Notice>{t("finance.noHistory")}</Notice>
        </div>
      )}
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {t("finance.chartHelp")}
        {showSavings ? ` ${t("finance.savingsIncludedHelp")}` : ""}
      </p>
      <details className="mt-5 border-t border-border pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">
          {t("finance.chartValues")}
        </summary>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-3 pr-3">{t("finance.date")}</th>
                <th className="pr-3">{mainLabel}</th>
                {showSavings && (
                  <th className="pr-3">{t("finance.savingsIncluded")}</th>
                )}
                <th className="text-right">{t("finance.coverage")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-t border-border">
                  <td className="whitespace-nowrap py-3 pr-3">
                    {dateLabel(point.date)}
                  </td>
                  <td className="whitespace-nowrap pr-3">
                    {point.value === null
                      ? t("finance.unknown")
                      : money(point.value)}
                  </td>
                  {showSavings && (
                    <td className="whitespace-nowrap pr-3">
                      {point.savingsValue === null
                        ? t("finance.unknown")
                        : money(point.savingsValue)}
                    </td>
                  )}
                  <td className="text-right">
                    {point.known}/{point.expected}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
