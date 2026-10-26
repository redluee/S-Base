"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  FinanceDashboard,
  FinanceData,
  FinancePeriod,
  FinanceSubscriptions,
} from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { financePeriodEnd } from "@/lib/finance";
import { Action, Notice, errorText, panel } from "./ui";
import { Accounts } from "./accounts";
import { Overview } from "./overview";
import { MonthPicker } from "./month-picker";
import { YearPicker } from "./year-picker";
import { FinanceImport } from "./import";
import { Transactions } from "./transactions";
import { FinanceSettings } from "./settings";
import { Upload } from "lucide-react";
import { Subscriptions } from "./subscriptions";

type Tab = "overview" | "accounts" | "import" | "transactions" | "subscriptions" | "settings";

export function FinanceClient() {
  return <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">{t("finance.loading")}</p>}>
    <FinanceContent />
  </Suspense>;
}

function FinanceContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab = requestedTab && ["overview", "accounts", "import", "transactions", "subscriptions", "settings"].includes(requestedTab)
    ? requestedTab as Tab
    : "overview";
  function setTab(value: Tab) {
    const href = value === "overview" ? "/finance" : `/finance?tab=${value}`;
    window.history.pushState(null, "", href);
  }
  const [subscriptions, setSubscriptions] = useState<FinanceSubscriptions | null>(null);
  const [data, setData] = useState<FinanceData | null>(null),
    [report, setReport] = useState<FinanceDashboard | null>(null);
  const [today] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");
  const resetInProgress = useRef(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    setError("");
    try {
      const [nextData, nextReport, nextSubscriptions] = await Promise.all([
        financeApi.data(),
        financeApi.dashboard(period, financePeriodEnd(period, date, today)),
        financeApi.subscriptions(),
      ]);
      if (current === revision.current) {
        setData(nextData);
        setReport(nextReport);
        setSubscriptions(nextSubscriptions);
      }
    } catch (error) {
      if (current === revision.current) setError(errorText(error));
      throw error;
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [date, period, today]);
  useEffect(() => {
    let active = true;
    const tracker = revision;
    void Promise.resolve()
      .then(() => {
        if (active) return refresh();
      })
      .catch(() => { });
    return () => {
      active = false;
      tracker.current++;
    };
  }, [refresh]);
  async function resetFinance() {
    if (resetInProgress.current || !window.confirm(t("finance.settings.resetConfirm"))) return;
    resetInProgress.current = true;
    setResetting(true);
    setError("");
    setNotice("");
    try {
      await financeApi.reset();
      revision.current++;
      setData(null);
      setReport(null);
      setTab("overview");
      setNotice(t("finance.settings.resetSuccess"));
      await refresh();
    } catch (error) {
      setError(errorText(error));
    } finally {
      resetInProgress.current = false;
      setResetting(false);
    }
  }
  return (
    <div className="space-y-6" aria-busy={loading || resetting}>
      <header className="flex items-center justify-between gap-3 sm:gap-5">
        <div className="min-w-0">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("finance.title")}
          </h1>
        </div>
        {data && (
          <div className="flex shrink-0 items-center gap-2">
            <Action variant="ghost" className="text-muted-foreground" aria-label={t("finance.import")} title={t("finance.import")} disabled={loading || resetting} onClick={() => setTab("import")}>
              <Upload className="size-4" aria-hidden="true" />
            </Action>
          </div>
        )}
      </header>
      <nav
        aria-label={t("finance.navigation")}
        className="flex gap-1 overflow-x-auto border-b border-border pb-2"
      >
        {(["overview", "transactions", "subscriptions", "accounts", "settings"] as Tab[]).map(
          (value) => (
            <Action
              key={value}
              variant="ghost"
              disabled={resetting}
              aria-current={tab === value ? "page" : undefined}
              className={
                tab === value
                  ? "bg-zinc-900 text-brand hover:bg-zinc-800 hover:text-brand"
                  : "text-muted-foreground"
              }
              onClick={() => setTab(value)}
            >
              {t(`finance.${value}`)}
            </Action>
          ),
        )}
      </nav>
      {notice && <Notice>{notice}</Notice>}
      {error && (
        <div className="space-y-2">
          <Notice error>
            {error} {t("finance.reloadHelp")}
          </Notice>
          <Action
            variant="outline"
            disabled={loading || resetting}
            onClick={() => void refresh().catch(() => { })}
          >
            {t("finance.retry")}
          </Action>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("finance.loading")}
        </p>
      )}
      {data && report && (
        <>
          {data.accounts.length === 0 && tab === "overview" && (
            <section className={`${panel} space-y-4`}>
              <h2 className="text-lg font-semibold">
                {t("finance.startTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("finance.startHelp")}
              </p>
              <Action variant="outline" onClick={() => setTab("import")}>
                {t("finance.import")}
              </Action>
            </section>
          )}
          <div
            className={loading || resetting ? "pointer-events-none opacity-50" : ""}
            inert={loading || resetting || !!error}
          >
            {(tab === "overview" || tab === "transactions") && data.accounts.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-end justify-between gap-2 sm:gap-4">
                  <div
                    className="flex shrink-0 gap-1"
                    aria-label={t("finance.period")}
                  >
                    {(["month", "year", "all"] as FinancePeriod[]).map(
                      (value) => (
                        <Action
                          key={value}
                          variant="outline"
                          aria-pressed={period === value}
                          className={`px-2 text-xs sm:px-2.5 sm:text-sm ${
                            period === value
                              ? "border-foreground text-foreground"
                              : "text-muted-foreground"
                          }`}
                          onClick={() => setPeriod(value)}
                        >
                          {t(`finance.${value}`)}
                        </Action>
                      ),
                    )}
                  </div>
                  {period === "month" && (
                    <MonthPicker value={date.slice(0, 7)} today={today} onChange={(month) => setDate(`${month}-01`)} />
                  )}
                  {period === "year" && (
                    <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                      <YearPicker value={Number(date.slice(0, 4))} maxYear={Number(today.slice(0, 4))} onChange={(year) => setDate(`${year}-01-01`)} />
                    </div>
                  )}
                </div>
                {tab === "overview" ? <Overview report={report} data={data} period={period} /> : (
                  <Transactions key={`${report.startDate}-${report.endDate}`} data={data} start={report.startDate} end={report.endDate} />
                )}
              </div>
            )}
            {tab === "accounts" && <Accounts data={data} onSaved={refresh} />}
            {tab === "subscriptions" && subscriptions && <Subscriptions report={subscriptions} data={data} onSaved={refresh} />}
            {tab === "settings" && (
              <FinanceSettings data={data} subscriptionMonthlyCents={subscriptions?.monthlyCents ?? null} busy={loading || resetting} onReset={() => void resetFinance()} onSaved={refresh} />
            )}
            {tab === "import" && (
              <FinanceImport data={data} onSaved={refresh} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
