"use client";

import { useState } from "react";
import type { FinanceData, FinanceSubscription, FinanceSubscriptions } from "@backend/types/finance";
import { Merge, Pencil, Trash2 } from "lucide-react";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { Action, panel } from "./ui";
import { SubscriptionForm, type SubscriptionAction } from "./subscription-form";

export function Subscriptions({ report, data, onSaved }: { report: FinanceSubscriptions; data: FinanceData; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState<{ entry: FinanceSubscription; action: SubscriptionAction } | null>(null);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.monthlyTotal")}</p>
          <p className="mt-3 break-words text-3xl font-medium tabular-nums">{money(report.monthlyCents)}</p>
        </div>
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.total")}</p>
          <p className="mt-3 break-words text-3xl font-medium tabular-nums">{money(report.totalCents)}</p>
        </div>
      </div>
      <section className={panel} aria-labelledby="subscriptions-title">
        <h2 id="subscriptions-title" className="text-lg font-semibold">{t("finance.subscriptions")}</h2>
        {report.entries.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{t("finance.subscriptions.empty")}</p>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {report.entries.map((entry) => (
              <article key={entry.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-sm font-medium">{entry.name}</h3>
                    <span className={`rounded-full border border-border px-2 py-1 text-xs ${entry.active ? "text-brand" : "text-muted-foreground"}`}>
                      {t(entry.active ? "finance.subscriptions.active" : "finance.subscriptions.inactive")}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs text-muted-foreground">{entry.accountIds.map((id) => data.accounts.find((account) => account.id === id)?.name).filter(Boolean).join(" · ")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{money(entry.paymentCents)} · {t(`finance.subscriptions.${entry.cadence}`)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{t("finance.subscriptions.payments", { count: String(entry.paymentCount) })} · {dateLabel(entry.firstDate)} — {dateLabel(entry.lastDate)}</p>
                </div>
                <dl className="grid min-w-0 grid-cols-2 gap-4 self-center">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("finance.subscriptions.perMonth")}</dt>
                    <dd className="mt-2 break-words text-base font-medium tabular-nums">{money(entry.monthlyCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("finance.subscriptions.spent")}</dt>
                    <dd className="mt-2 break-words text-base font-medium tabular-nums">{money(entry.totalCents)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <Action variant="ghost" onClick={() => setEditing({ entry, action: "rename" })}>
                    <Pencil className="size-4" aria-hidden="true" />{t("finance.subscriptions.rename")}
                  </Action>
                  <Action variant="ghost" disabled={report.entries.length < 2} onClick={() => setEditing({ entry, action: "merge" })}>
                    <Merge className="size-4" aria-hidden="true" />{t("finance.subscriptions.merge")}
                  </Action>
                  <Action variant="ghost" className="text-destructive" onClick={() => setEditing({ entry, action: "exclude" })}>
                    <Trash2 className="size-4" aria-hidden="true" />{t("finance.subscriptions.exclude")}
                  </Action>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && <SubscriptionForm entry={editing.entry} action={editing.action} entries={report.entries} accounts={data.accounts} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}
