"use client";

import { memo, type Ref } from "react";
import type { FinanceTransaction } from "@backend/types/finance";
import type { FinanceHistoryPoint } from "@/lib/finance-history";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";

export const HistoryRow = memo(function HistoryRow({ point, selected, rowRef, entries, loaded, failed }: {
  point: FinanceHistoryPoint;
  selected: boolean;
  rowRef?: Ref<HTMLTableRowElement>;
  entries?: FinanceTransaction[];
  loaded: boolean;
  failed: boolean;
}) {
  return (
    <tr ref={rowRef} aria-current={selected ? "true" : undefined} className={`border-t border-border ${selected ? "bg-muted text-foreground" : ""}`}>
      <td className="whitespace-nowrap py-3 pr-3">{dateLabel(point.date)}</td>
      <td className="whitespace-nowrap pr-3">{point.value === null ? t("finance.unknown") : money(point.value)}</td>
      <td className="min-w-40 py-3 pr-3">
        {!loaded ? (
          <span className="text-muted-foreground">{failed ? "—" : t("finance.loading")}</span>
        ) : entries?.length ? (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{entry.name || t("finance.transactions.unnamed")}</span>
                <span className="whitespace-nowrap text-muted-foreground">{entry.amountCents > 0 ? "+" : ""}{money(entry.amountCents)}</span>
              </li>
            ))}
          </ul>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="text-right">{point.known}/{point.expected}</td>
    </tr>
  );
});
