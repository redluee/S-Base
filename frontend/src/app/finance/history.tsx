"use client";

import { useState } from "react";
import type { FinanceDashboard, FinanceData } from "@backend/types/finance";
import { dateLabel, money } from "@/lib/finance";
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
  const points = report.history.map((point) => {
    if (series === "total")
      return {
        date: point.date,
        value: point.complete ? point.totalCents : null,
        known: point.known,
        expected: point.expected,
      };
    const accounts =
      series === "savings"
        ? point.accounts.filter((a) => a.type === "savings")
        : point.accounts.filter((a) => a.id === Number(series));
    const known = accounts.filter((a) => a.balanceCents !== null).length;
    return {
      date: point.date,
      value:
        accounts.length && accounts.length === known
          ? accounts.reduce((sum, a) => sum + a.balanceCents!, 0)
          : null,
      known,
      expected: accounts.length,
    };
  });
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  const min = Math.min(...values),
    max = Math.max(...values),
    spread = max - min || Math.max(Math.abs(max) * 0.1, 100);
  const time = (date: string) => Date.parse(`${date}T12:00:00Z`);
  const start = time(report.startDate),
    duration = time(report.endDate) - start || 1;
  const x = (date: string) => 12 + ((time(date) - start) / duration) * 576;
  const y = (value: number) => 180 - ((value - min) / spread) * 150;
  let path = "",
    previous: number | null = null;
  for (const point of points) {
    if (point.value === null) {
      previous = null;
      continue;
    }
    path +=
      previous === null
        ? ` M ${x(point.date)} ${y(point.value)}`
        : ` H ${x(point.date)} V ${y(point.value)}`;
    previous = point.value;
  }
  const selectedIds =
    series === "total"
      ? data.accounts.map((a) => a.id)
      : series === "savings"
        ? data.accounts.filter((a) => a.type === "savings").map((a) => a.id)
        : [Number(series)];
  const observedDates = new Set(
    data.observations
      .filter(
        (o) => selectedIds.includes(o.accountId) && o.date <= report.endDate,
      )
      .map((o) => o.date),
  );
  return (
    <section className={panel} aria-labelledby="history-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="history-title" className="text-lg font-semibold">
          {t("finance.progression")}
        </h2>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:w-64">
          {t("finance.historySeries")}
          <select
            className={selectClass}
            value={series}
            onChange={(e) => setSeries(e.target.value)}
          >
            <option value="total">{t("finance.trackedMoney")}</option>
            <option value="savings">{t("finance.savingsTotal")}</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.archived ? ` · ${t("finance.archived")}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t("finance.chartHelp")}
      </p>
      {observedDates.size < 2 && (
        <div className="mt-4">
          <Notice>{t("finance.insufficientHistory")}</Notice>
        </div>
      )}
      {values.length > 0 ? (
        <div className="mt-5">
          <div className="flex flex-wrap justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>
              {t("finance.lowest")}: {money(min)}
            </span>
            <span>
              {t("finance.highest")}: {money(max)}
            </span>
          </div>
          <svg
            role="img"
            aria-label={t("finance.historyChart")}
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
            className="mt-2 h-48 w-full overflow-visible text-zinc-200"
          >
            <title>{t("finance.historyChart")}</title>
            <desc>{t("finance.chartHelp")}</desc>
            {[30, 105, 180].map((pos) => (
              <line
                key={pos}
                x1="0"
                x2="600"
                y1={pos}
                y2={pos}
                stroke="currentColor"
                opacity="0.1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {points.map(
              (point) =>
                point.value !== null && (
                  <circle
                    key={point.date}
                    cx={x(point.date)}
                    cy={y(point.value)}
                    r="3"
                    fill="currentColor"
                  >
                    <title>
                      {dateLabel(point.date)}: {money(point.value)}
                    </title>
                  </circle>
                ),
            )}
          </svg>
          <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>{dateLabel(report.startDate)}</span>
            <span>{dateLabel(report.endDate)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Notice>{t("finance.noHistory")}</Notice>
        </div>
      )}
      <details className="mt-5 border-t border-border pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">
          {t("finance.chartValues")}
        </summary>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-3">{t("finance.date")}</th>
                <th>{t("finance.balance")}</th>
                <th className="text-right">{t("finance.coverage")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-t border-border">
                  <td className="py-3">{dateLabel(point.date)}</td>
                  <td>
                    {point.value === null
                      ? t("finance.unknown")
                      : money(point.value)}
                  </td>
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
