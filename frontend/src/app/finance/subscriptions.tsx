import type { FinanceData, FinanceSubscriptions } from "@backend/types/finance";
import { dateLabel, money } from "@/lib/finance";
import { t } from "@/lib/lang";
import { panel } from "./ui";

export function Subscriptions({ report, data }: { report: FinanceSubscriptions; data: FinanceData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.monthlyTotal")}</p>
          <p className="mt-3 break-words text-3xl font-medium tabular-nums">{money(report.monthlyCents)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("finance.subscriptions.monthlyHelp")}</p>
        </div>
        <div className={panel}>
          <p className="text-sm text-muted-foreground">{t("finance.subscriptions.total")}</p>
          <p className="mt-3 break-words text-3xl font-medium tabular-nums">{money(report.totalCents)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("finance.subscriptions.totalHelp")}</p>
        </div>
      </div>
      <section className={panel} aria-labelledby="subscriptions-title">
        <h2 id="subscriptions-title" className="text-lg font-semibold">{t("finance.subscriptions")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("finance.subscriptions.help")}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("finance.subscriptions.importedThrough")} {dateLabel(report.lastImportedDate)} · {t("finance.subscriptions.asOf")} {dateLabel(report.asOf)}
        </p>
        {report.entries.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{t("finance.subscriptions.empty")}</p>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {report.entries.map((entry) => (
              <article key={`${entry.accountId}-${entry.name}`} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-sm font-medium">{entry.name}</h3>
                    <span className={`rounded-full border border-border px-2 py-1 text-xs ${entry.active ? "text-brand" : "text-muted-foreground"}`}>
                      {t(entry.active ? "finance.subscriptions.active" : "finance.subscriptions.inactive")}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs text-muted-foreground">{data.accounts.find((account) => account.id === entry.accountId)?.name}</p>
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
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
