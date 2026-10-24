"use client";

import { useState } from "react";
import type { FinanceAccount, FinanceData } from "@backend/types/finance";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { AccountIcon } from "./account-icon";
import { AccountIconPicker } from "./account-icon-picker";
import { Action, Notice, panel } from "./ui";

export function Accounts({ data, onSaved }: { data: FinanceData; onSaved: () => Promise<void> }) {
  const [editingIcon, setEditingIcon] = useState<FinanceAccount | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("finance.accounts")}</h2>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t("finance.importOnlyHelp")}
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
                  <h3 className="flex items-center gap-2 font-medium"><AccountIcon icon={account.icon} /><span className="min-w-0 break-words">{account.name}</span></h3>
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
                  <Action variant="outline" onClick={() => setEditingIcon(account)} aria-label={t("finance.accountIconFor", { name: account.name })}>
                    {t("finance.accountIcon")}
                  </Action>
                  <Action
                    variant="outline"
                    onClick={() =>
                      setExpanded(expanded === account.id ? null : account.id)
                    }
                    aria-expanded={expanded === account.id}
                  >
                    {t("finance.history")}
                  </Action>
                </div>
              </div>
              {expanded === account.id && (
                <div className="mt-4 border-t border-border pt-4">
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
      {editingIcon && <AccountIconPicker account={editingIcon} onClose={() => setEditingIcon(null)} onSaved={onSaved} />}
    </section>
  );
}
