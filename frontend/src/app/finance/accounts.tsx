"use client";

import { useState } from "react";
import type {
  FinanceAccount,
  FinanceData,
  FinanceObservation,
} from "@backend/types/finance";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { Action, Notice, panel } from "./ui";

export function Accounts({
  data,
  busy,
  onNew,
  onEdit,
  onArchive,
  onObservationEdit,
  onObservationDelete,
}: {
  data: FinanceData;
  busy: boolean;
  onNew: () => void;
  onEdit: (account: FinanceAccount) => void;
  onArchive: (account: FinanceAccount) => void;
  onObservationEdit: (observation: FinanceObservation) => void;
  onObservationDelete: (observation: FinanceObservation) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("finance.accounts")}</h2>
        <Action variant="outline" onClick={onNew}>
          {t("finance.newAccount")}
        </Action>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t("finance.archiveHelp")}
      </p>
      <div className="mt-4 divide-y divide-border">
        {data.accounts.map((account) => {
          const history = data.observations.filter(
              (o) => o.accountId === account.id,
            ),
            last = history.at(-1);
          return (
            <div key={account.id} className="py-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <h3 className="break-words font-medium">{account.name}</h3>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {t(`finance.${account.type}`)}
                    {account.bank ? ` · ${account.bank}` : ""}
                    {account.archived ? ` · ${t("finance.archived")}` : ""}
                  </p>
                  <p className="mt-3 text-xl tabular-nums">
                    {last ? money(last.balanceCents) : t("finance.unknown")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("finance.lastUpdated")}: {dateLabel(last?.date ?? null)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Action
                    variant="outline"
                    onClick={() =>
                      setExpanded(expanded === account.id ? null : account.id)
                    }
                    aria-expanded={expanded === account.id}
                  >
                    {t("finance.history")}
                  </Action>
                  <Action
                    variant="outline"
                    onClick={() => onEdit(account)}
                    disabled={busy}
                  >
                    {t("Edit")}
                  </Action>
                  <Action
                    variant="ghost"
                    onClick={() => onArchive(account)}
                    disabled={busy}
                  >
                    {t(
                      account.archived ? "finance.restore" : "finance.archive",
                    )}
                  </Action>
                </div>
              </div>
              {expanded === account.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    {t("finance.observationHelp")}
                  </p>
                  {!history.length ? (
                    <Notice>{t("finance.noHistory")}</Notice>
                  ) : (
                    <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                      {[...history].reverse().map((observation) => (
                        <li
                          key={observation.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3"
                        >
                          <p className="text-sm tabular-nums">
                            {dateLabel(observation.date)} ·{" "}
                            {money(observation.balanceCents)}
                          </p>
                          <div className="flex gap-1">
                            <Action
                              variant="ghost"
                              aria-label={t("finance.editDatedBalance", {
                                date: dateLabel(observation.date),
                                name: account.name,
                              })}
                              disabled={busy}
                              onClick={() => onObservationEdit(observation)}
                            >
                              {t("Edit")}
                            </Action>
                            <Action
                              variant="ghost"
                              className="text-destructive"
                              aria-label={t("finance.deleteDatedBalance", {
                                date: dateLabel(observation.date),
                                name: account.name,
                              })}
                              disabled={busy}
                              onClick={() => onObservationDelete(observation)}
                            >
                              {t("Delete")}
                            </Action>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
