"use client";

import { useState } from "react";
import type { FinanceData, FinanceSubscription, FinanceSubscriptions } from "@backend/types/finance";
import { History, Merge, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { Menu } from "@base-ui/react/menu";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Transactions } from "./transactions";
import { panel } from "./ui";
import { SubscriptionForm, type SubscriptionAction } from "./subscription-form";

export function Subscriptions({ report, data, onSaved }: { report: FinanceSubscriptions; data: FinanceData; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState<{ entry: FinanceSubscription; action: SubscriptionAction } | null>(null);
  const [history, setHistory] = useState<FinanceSubscription | null>(null);
  const menuItem = "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.monthlyTotal")}</p>
          <p className="mt-3 break-words text-xl sm:text-3xl font-medium tabular-nums">{money(report.monthlyCents)}</p>
        </div>
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.total")}</p>
          <p className="mt-3 break-words text-xl sm:text-3xl font-medium tabular-nums">{money(report.totalCents)}</p>
        </div>
      </div>
      <section className={panel} aria-labelledby="subscriptions-title">
        <h2 id="subscriptions-title" className="text-lg font-semibold">{t("finance.subscriptions")}</h2>
        {report.entries.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{t("finance.subscriptions.empty")}</p>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {report.entries.map((entry) => (
              <article key={entry.id} className="grid gap-4 py-5 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
                <dl className="order-3 col-span-2 grid min-w-0 grid-cols-2 gap-4 self-center lg:order-none lg:col-span-1">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("finance.subscriptions.perMonth")}</dt>
                    <dd className="mt-2 break-words text-base font-medium tabular-nums">{money(entry.monthlyCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("finance.subscriptions.spent")}</dt>
                    <dd className="mt-2 break-words text-base font-medium tabular-nums">{money(entry.totalCents)}</dd>
                  </div>
                </dl>
                <Menu.Root>
                  <Menu.Trigger aria-label={t("finance.subscriptions.actions", { name: entry.name })} className="flex size-11 items-center justify-center self-start rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-brand">
                    <MoreHorizontal className="size-5" aria-hidden="true" />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner align="end" sideOffset={4} className="z-50">
                      <Menu.Popup className="min-w-52 rounded-xl bg-popover p-1 ring-1 ring-foreground/10 outline-none">
                        <Menu.Item className={menuItem} onClick={() => setHistory(entry)}>
                          <History className="size-4" aria-hidden="true" />{t("finance.subscriptions.history")}
                        </Menu.Item>
                        <Menu.Item className={menuItem} onClick={() => setEditing({ entry, action: "rename" })}>
                          <Pencil className="size-4" aria-hidden="true" />{t("finance.subscriptions.rename")}
                        </Menu.Item>
                        <Menu.Item className={menuItem} disabled={report.entries.length < 2} onClick={() => setEditing({ entry, action: "merge" })}>
                          <Merge className="size-4" aria-hidden="true" />{t("finance.subscriptions.merge")}
                        </Menu.Item>
                        <Menu.Item className={`${menuItem} text-destructive`} onClick={() => setEditing({ entry, action: "exclude" })}>
                          <Trash2 className="size-4" aria-hidden="true" />{t("finance.subscriptions.exclude")}
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </article>
            ))}
          </div>
        )}
      </section>
      {history && <ModalOverlay open onClose={() => setHistory(null)} label={`${t("finance.transactions")} · ${history.name}`}>
        <div className="max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto">
          <Transactions data={data} start={history.firstDate} end={history.lastDate} subscriptionId={history.id} title={history.name} onClose={() => setHistory(null)} />
        </div>
      </ModalOverlay>}
      {editing && <SubscriptionForm entry={editing.entry} action={editing.action} entries={report.entries} accounts={data.accounts} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}
