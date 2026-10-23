"use client";

import { useState, type FormEvent } from "react";
import type { FinanceData, FinanceObservation } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { dateLabel, money, moneyInput, parseMoney } from "@/lib/finance";
import { Action, Field, Notice, errorText, panel } from "./ui";

export function Balances({
  data,
  editing,
  onSaved,
}: {
  data: FinanceData;
  editing?: FinanceObservation;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(editing?.date ?? data.today);
  const [values, setValues] = useState<Record<number, string>>(
    editing ? { [editing.accountId]: moneyInput(editing.balanceCents) } : {},
  );
  const [replace, setReplace] = useState<Record<number, boolean>>(
    editing ? { [editing.accountId]: true } : {},
  );
  const [archived, setArchived] = useState(
    !!editing &&
      !!data.accounts.find((a) => a.id === editing.accountId)?.archived,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const accounts = data.accounts.filter((a) => !a.archived || archived);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const entries = accounts
        .filter((a) => values[a.id]?.trim())
        .map((a) => {
          const existing = data.observations.find(
            (o) => o.accountId === a.id && o.date === date,
          );
          if (existing && !replace[a.id])
            throw new Error("finance.explicitEdit");
          return {
            accountId: a.id,
            balanceCents: parseMoney(values[a.id]),
            expectedCents: existing?.balanceCents ?? null,
          };
        });
      if (!entries.length) throw new Error("finance.chooseBalance");
      await financeApi.balances(date, entries);
      setValues({});
      setReplace({});
      await onSaved();
      setSaved(true);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={panel} aria-labelledby="balances-title">
      <h2 id="balances-title" className="text-lg font-semibold">
        {t("finance.updateTogether")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t("finance.bulkHelp")}
      </p>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <div className="max-w-xs">
          <Field
            label={t("finance.balanceDate")}
            type="date"
            min="1900-01-01"
            max={data.today}
            value={date}
            required
            disabled={busy}
            onInput={(e) => {
              setDate(e.currentTarget.value);
              setValues({});
              setReplace({});
              setSaved(false);
            }}
          />
        </div>
        {data.accounts.some((a) => a.archived) && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={archived}
              disabled={busy}
              onChange={(e) => setArchived(e.target.checked)}
              className="size-5 accent-brand"
            />
            {t("finance.includeArchived")}
          </label>
        )}
        <fieldset disabled={busy} className="divide-y divide-border">
          {accounts.map((account) => {
            const existing = data.observations.find(
              (o) => o.accountId === account.id && o.date === date,
            );
            const last = data.observations
              .filter((o) => o.accountId === account.id)
              .at(-1);
            const beforeOpening = date < account.openingDate;
            return (
              <div
                key={account.id}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_16rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {account.name}{" "}
                    {account.archived && (
                      <span className="text-xs text-muted-foreground">
                        {t("finance.archived")}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("finance.lastBalance")}:{" "}
                    {money(last?.balanceCents ?? null)} ·{" "}
                    {last ? dateLabel(last.date) : t("finance.unknown")}
                  </p>
                  {beforeOpening && (
                    <p className="mt-1 text-xs text-destructive">
                      {t("finance.beforeOpening")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Field
                    label={t("finance.balanceFor", { name: account.name })}
                    inputMode="decimal"
                    value={values[account.id] ?? ""}
                    disabled={beforeOpening}
                    onChange={(e) => {
                      setValues({ ...values, [account.id]: e.target.value });
                      setSaved(false);
                    }}
                    placeholder={t("finance.leaveBlank")}
                  />
                  {existing && (
                    <label className="flex min-h-11 items-center gap-3 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-5 shrink-0 accent-brand"
                        checked={replace[account.id] ?? false}
                        onChange={(e) =>
                          setReplace({
                            ...replace,
                            [account.id]: e.target.checked,
                          })
                        }
                      />
                      {t("finance.replaceBalance", {
                        amount: money(existing.balanceCents),
                      })}
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </fieldset>
        {!accounts.length && <Notice>{t("finance.noActiveAccounts")}</Notice>}
        {error && <Notice error>{error}</Notice>}
        {saved && <Notice>{t("finance.balancesSaved")}</Notice>}
        <Action
          type="submit"
          disabled={busy || !accounts.length}
          className="bg-brand text-black hover:bg-brand-hover"
        >
          {t(busy ? "Saving..." : "finance.saveBalances")}
        </Action>
      </form>
    </section>
  );
}
