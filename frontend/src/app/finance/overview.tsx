import { useState } from "react";
import type { FinanceDashboard, FinanceData, FinancePeriod } from "@backend/types/finance";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { dateLabel, money } from "@/lib/finance";
import { AccountIcon } from "./account-icon";
import { AnimatedMoney } from "./animated-money";
import { Transactions } from "./transactions";
import { History } from "./history";
import { NetChart } from "./net-chart";
import { Action, Notice, panel } from "./ui";

export function Overview({ data, report, period }: { data: FinanceData; report: FinanceDashboard; period: FinancePeriod; }) {
  const [chart, setChart] = useState<"balance" | "net">("balance");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const activity = report.activity;
  const hasTransactions = !!activity?.transactionCount;
  const lastDataDate = report.end.accounts.reduce<string | null>((latest, account) =>
    account.lastDate && (!latest || account.lastDate > latest) ? account.lastDate : latest, null);
  const currentAccounts = report.end.accounts.filter((account) => account.type === "current");
  const currentCents = currentAccounts.length && currentAccounts.every((account) => account.balanceCents === null)
    ? null
    : currentAccounts.reduce((sum, account) => sum + (account.balanceCents ?? 0), 0);
  const changeCents = report.comparison.changeCents;
  return (
    <div className="space-y-5">
      {!report.end.complete && <Notice>{t("finance.incomplete")}</Notice>}
      <section className={`${panel} flex flex-wrap items-end justify-between gap-6`}>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><Wallet className="size-4 shrink-0" aria-hidden="true" /><span>{t("finance.trackedMoney")}</span><span className="text-xs">· {t("finance.latestData", { date: dateLabel(lastDataDate) })}</span></p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="break-words text-4xl font-medium tracking-tight tabular-nums sm:text-5xl"><AnimatedMoney cents={report.end.totalCents} /></p>
            {period !== "all" && changeCents !== null && <p aria-label={`${t("finance.balanceChange")}: ${money(changeCents)}`} className={`text-lg font-medium tabular-nums ${changeCents > 0 ? "text-brand" : changeCents < 0 ? "text-destructive" : "text-muted-foreground"}`}>{changeCents >= 0 ? "+" : ""}<AnimatedMoney cents={changeCents} /></p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 sm:text-right">
          <div>
            <p className="text-xs text-muted-foreground">{t("finance.currentTotal")}</p>
            <p className="mt-2 text-2xl font-medium tracking-tight tabular-nums"><AnimatedMoney cents={currentCents} /></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("finance.savingsTotal")}</p>
            <p className="mt-2 text-2xl font-medium tracking-tight tabular-nums"><AnimatedMoney cents={report.end.savingsCents} /></p>
          </div>
        </div>
      </section>
      {period === "month" && report.budget && <>
        <button type="button" className={`${panel} block w-full cursor-pointer text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-brand`} aria-haspopup="dialog" aria-expanded={budgetOpen} onClick={() => setBudgetOpen(true)}>
          <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">{t("finance.budget.remaining", { month: report.budget.month })}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></span>
          <span className={`mt-3 block break-words text-3xl font-medium tracking-tight tabular-nums ${report.budget.remainingCents < 0 ? "text-destructive" : report.budget.remainingCents > 0 ? "text-brand" : "text-foreground"}`}>{money(report.budget.remainingCents)}</span>
        </button>
        {budgetOpen && <ModalOverlay open onClose={() => setBudgetOpen(false)} label={t("finance.budget.transactions", { month: report.budget.month })}>
          <div className="max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto">
            <Transactions key={report.endDate} data={data} start={`${report.budget.month}-01`} end={report.endDate} budget title={t("finance.budget.transactions", { month: report.budget.month })} onClose={() => setBudgetOpen(false)} />
          </div>
        </ModalOverlay>}
      </>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {([
          { key: "income", value: activity?.incomeCents, icon: ArrowDownLeft },
          { key: "spending", value: activity?.spendingCents, icon: ArrowUpRight },
          { key: "net", value: activity?.netCents, icon: Wallet },
        ] as const).map(({ key, value, icon: Icon }) => <section key={key} className={`${panel} ${key === "net" ? "col-span-2 sm:col-span-1" : ""}`}>
          <h2 className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{t(`finance.${key}`)}</h2>
          <p className="mt-3 break-words text-xl font-medium tracking-tight tabular-nums sm:text-2xl">{hasTransactions ? <AnimatedMoney cents={value ?? 0} /> : t("finance.unknown")}</p>
        </section>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{hasTransactions ? t("finance.activity.scope", { count: String(activity!.transactionCount), excluded: String(activity!.excludedCount) }) : t("finance.activity.empty")}</p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1" aria-label={t("finance.chartType")}>
            {(["balance", "net"] as const).map((value) => <Action key={value} variant="outline" aria-pressed={chart === value} onClick={() => setChart(value)}>{t(value === "balance" ? "finance.progression" : "finance.netChart")}</Action>)}
          </div>
          {chart === "balance" ? <History report={report} data={data} /> : <NetChart end={report.endDate} />}
        </div>
        <section className={panel}>
          <h2 className="text-base font-semibold">{t("finance.breakdown")}</h2>
          <div className="mt-3 divide-y divide-border">
            {report.end.accounts.map((account) => {
              const coverage = activity?.coverage.find((entry) => entry.accountId === account.id);
              return <div key={account.id} className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-medium"><AccountIcon icon={account.icon} /><span className="min-w-0 break-words">{account.name}</span></p>
                  <p className="shrink-0 text-sm tabular-nums">{account.balanceCents === null ? t("finance.unknown") : money(account.balanceCents)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t(`finance.${account.type}`)}{account.archived ? ` · ${t("finance.archived")}` : ""}</p>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">{t("finance.lastUpdated")}: {dateLabel(account.lastDate)}</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{coverage ? t("finance.activity.accountCoverage", { start: dateLabel(coverage.firstDate), end: dateLabel(coverage.lastDate) }) : t("finance.activity.noAccountTransactions")}</p>
              </div>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
