"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FinanceAccount,
  FinanceDashboard,
  FinanceData,
  FinanceObservation,
  FinancePeriod,
} from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { dateLabel } from "@/lib/finance";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Action, Field, Notice, errorText, panel } from "./ui";
import { AccountForm } from "./account-form";
import { Balances } from "./balances";
import { Accounts } from "./accounts";
import { Overview } from "./overview";
import { Goals } from "./goals";
import { FinanceImport } from "./import";

type Tab = "overview" | "accounts" | "balances" | "goals" | "import";
type Confirmation = {
  title: string;
  description: string;
  action: () => Promise<unknown>;
  destructive?: boolean;
};

export function FinanceClient() {
  const [data, setData] = useState<FinanceData | null>(null),
    [report, setReport] = useState<FinanceDashboard | null>(null);
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [period, setPeriod] = useState<FinancePeriod>("month"),
    [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<FinanceAccount | "new" | null>(null),
    [observation, setObservation] = useState<FinanceObservation | undefined>();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    setError("");
    try {
      const [nextData, nextReport] = await Promise.all([
        financeApi.data(),
        financeApi.dashboard(period, date),
      ]);
      if (current === revision.current) {
        setData(nextData);
        setReport(nextReport);
      }
    } catch (error) {
      if (current === revision.current) setError(errorText(error));
      throw error;
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [date, period]);
  useEffect(() => {
    let active = true;
    const tracker = revision;
    void Promise.resolve()
      .then(() => {
        if (active) return refresh();
      })
      .catch(() => {});
    return () => {
      active = false;
      tracker.current++;
    };
  }, [refresh]);
  async function confirm() {
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      await confirmation.action();
      setConfirmation(null);
      await refresh();
    } catch (error) {
      setConfirmation(null);
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6" aria-busy={loading}>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            {t("finance.personalOverview")}
          </p>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("finance.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("finance.subtitle")}
          </p>
        </div>
        {data && (
          <Action
            className="bg-brand text-black hover:bg-brand-hover"
            disabled={loading || busy}
            onClick={() => {
              setObservation(undefined);
              setTab("balances");
            }}
          >
            {t("finance.updateBalances")}
          </Action>
        )}
      </header>
      <nav
        aria-label={t("finance.navigation")}
        className="flex gap-1 overflow-x-auto border-b border-border pb-2"
      >
        {(["overview", "accounts", "balances", "import", "goals"] as Tab[]).map(
          (value) => (
            <Action
              key={value}
              variant="ghost"
              disabled={busy}
              aria-current={tab === value ? "page" : undefined}
              className={
                tab === value
                  ? "bg-zinc-900 text-brand hover:bg-zinc-800 hover:text-brand"
                  : "text-muted-foreground"
              }
              onClick={() => {
                setTab(value);
                if (value === "balances") setObservation(undefined);
              }}
            >
              {t(`finance.${value}`)}
            </Action>
          ),
        )}
      </nav>
      {error && (
        <div className="space-y-2">
          <Notice error>
            {error} {t("finance.reloadHelp")}
          </Notice>
          <Action
            variant="outline"
            disabled={loading}
            onClick={() => void refresh().catch(() => {})}
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
          {data.accounts.length === 0 && tab !== "import" && (
            <section className={`${panel} space-y-4`}>
              <h2 className="text-lg font-semibold">
                {t("finance.startTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("finance.startHelp")}
              </p>
              <Action variant="outline" onClick={() => setEditing("new")}>
                {t("finance.newAccount")}
              </Action>
            </section>
          )}
          <div
            className={loading ? "pointer-events-none opacity-50" : ""}
            inert={loading || !!error}
          >
            {tab === "overview" && data.accounts.length > 0 && (
              <div className="space-y-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div
                    className="flex flex-wrap gap-1"
                    aria-label={t("finance.period")}
                  >
                    {(["month", "year", "all"] as FinancePeriod[]).map(
                      (value) => (
                        <Action
                          key={value}
                          variant="outline"
                          aria-pressed={period === value}
                          className={
                            period === value
                              ? "border-foreground text-foreground"
                              : "text-muted-foreground"
                          }
                          onClick={() => setPeriod(value)}
                        >
                          {t(`finance.${value}`)}
                        </Action>
                      ),
                    )}
                  </div>
                  <div className="w-full sm:w-48">
                    <Field
                      label={t("finance.asOfDate")}
                      type="date"
                      min="1900-01-01"
                      max={data.today}
                      required
                      value={date}
                      onInput={(e) => {
                        if (e.currentTarget.value)
                          setDate(e.currentTarget.value);
                      }}
                    />
                  </div>
                </div>
                <Overview report={report} data={data} />
              </div>
            )}
            {tab === "accounts" && (
              <Accounts
                data={data}
                busy={busy}
                onNew={() => setEditing("new")}
                onEdit={setEditing}
                onArchive={(account) =>
                  setConfirmation({
                    title: t(
                      account.archived ? "finance.restore" : "finance.archive",
                    ),
                    description: t("finance.archiveHelp"),
                    action: () =>
                      financeApi.archive(account.id, !account.archived),
                  })
                }
                onObservationEdit={(entry) => {
                  setObservation(entry);
                  setTab("balances");
                }}
                onObservationDelete={(entry) =>
                  setConfirmation({
                    title: t("finance.deleteObservation"),
                    description: t("finance.deleteObservationHelp", {
                      date: dateLabel(entry.date),
                    }),
                    action: () =>
                      financeApi.deleteObservation(entry.accountId, entry.date),
                    destructive: true,
                  })
                }
              />
            )}
            {tab === "balances" && data.accounts.length > 0 && (
              <Balances
                key={observation?.id ?? "bulk"}
                data={data}
                editing={observation}
                onSaved={refresh}
              />
            )}
            {tab === "import" && (
              <FinanceImport data={data} onSaved={refresh} />
            )}
            {tab === "goals" && (
              <Goals
                data={data}
                onSaved={refresh}
                onDelete={(goal) =>
                  setConfirmation({
                    title: t("finance.deleteGoal"),
                    description: t("finance.deleteGoalHelp"),
                    action: () => financeApi.deleteGoal(goal.id),
                    destructive: true,
                  })
                }
              />
            )}
          </div>
        </>
      )}
      {data && editing && (
        <AccountForm
          account={editing === "new" ? undefined : editing}
          data={data}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={!!confirmation}
        title={confirmation?.title ?? ""}
        description={confirmation?.description ?? ""}
        confirmLabel={t("finance.confirm")}
        cancelLabel={t("Cancel")}
        onConfirm={() => void confirm()}
        onCancel={() => {
          if (!busy) setConfirmation(null);
        }}
        busy={busy}
        tone={confirmation?.destructive ? "destructive" : "primary"}
      />
    </div>
  );
}
