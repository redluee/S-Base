import type {
  FinanceComparison,
  FinanceDashboard,
  FinanceData,
} from "@backend/types/finance";
import { t } from "@/lib/lang";
import { dateLabel, money } from "@/lib/finance";
import { History } from "./history";
import { Notice, panel } from "./ui";

function Change({ value }: { value: FinanceComparison }) {
  if (value.changeCents === null)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        {t(`finance.comparison.${value.reason}`)}
      </p>
    );
  return (
    <div className="mt-3 text-xs tabular-nums text-muted-foreground">
      <span>
        {value.changeCents > 0 ? "+" : ""}
        {money(value.changeCents)}
      </span>
      <span>
        {" "}
        ·{" "}
        {value.percent === null
          ? t("finance.zeroBaseline")
          : `${value.percent > 0 ? "+" : ""}${value.percent.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}%`}
      </span>
      <p className="mt-1">{t("finance.balanceChange")}</p>
    </div>
  );
}
export function Overview({
  data,
  report,
}: {
  data: FinanceData;
  report: FinanceDashboard;
}) {
  const savingsAccounts = report.end.accounts.filter(
    (a) => a.type === "savings",
  );
  const savingsIncomplete = savingsAccounts.some(
    (a) => a.balanceCents === null,
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <section className={panel}>
          <h2 className="text-sm text-muted-foreground">
            {t("finance.trackedMoney")}
          </h2>
          <p className="mt-3 break-words text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
            {money(report.end.totalCents)}
          </p>
          {!report.end.complete && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("finance.knownPart")}
            </p>
          )}
          <Change value={report.comparison} />
        </section>
        <section className={panel}>
          <h2 className="text-sm text-muted-foreground">
            {t("finance.savingsTotal")}
          </h2>
          <p className="mt-3 break-words text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
            {money(report.end.savingsCents)}
          </p>
          {savingsIncomplete && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("finance.knownPart")}
            </p>
          )}
          <Change value={report.savingsComparison} />
        </section>
      </div>
      <p className="text-xs text-muted-foreground">
        {dateLabel(report.startDate)} → {dateLabel(report.endDate)} ·{" "}
        {t("finance.coverageCount", {
          known: String(report.end.known),
          total: String(report.end.expected),
        })}
      </p>
      {!report.end.complete && <Notice>{t("finance.incomplete")}</Notice>}
      {report.end.mixedDates && <Notice>{t("finance.mixedDates")}</Notice>}
      {!report.end.mixedDates && report.start.mixedDates && (
        <Notice>{t("finance.mixedBaseline")}</Notice>
      )}
      <History report={report} data={data} />
      <section className={panel}>
        <h2 className="text-lg font-semibold">{t("finance.breakdown")}</h2>
        <div className="mt-3 divide-y divide-border">
          {report.end.accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{account.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`finance.${account.type}`)}
                  {account.archived
                    ? ` · ${t("finance.archivedIncluded")}`
                    : ""}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p>
                  {account.balanceCents === null
                    ? t("finance.unknown")
                    : money(account.balanceCents)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("finance.lastUpdated")}: {dateLabel(account.lastDate)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {!report.end.accounts.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("finance.noAccountsOnDate")}
          </p>
        )}
      </section>
      <details className={`${panel} text-sm text-muted-foreground`}>
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-foreground">
          {t("finance.howItWorks")}
        </summary>
        <div className="mt-3 max-w-3xl space-y-3 leading-relaxed">
          <p>{t("finance.manualHelp")}</p>
          <p>{t("finance.archiveHelp")}</p>
          <p>{t("finance.comparisonHelp")}</p>
          <p>{t("finance.scopeHelp")}</p>
        </div>
      </details>
    </div>
  );
}
