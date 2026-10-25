"use client";

import { useState, type FormEvent } from "react";
import type { FinanceData } from "@backend/types/finance";
import { t } from "@/lib/lang";
import { financeApi } from "@/lib/api/finance";
import { money, moneyInput, parseMoney } from "@/lib/finance";
import { Action, Field, Notice, errorText, panel } from "./ui";

export function FinanceSettings({ data, subscriptionMonthlyCents, busy, onReset, onSaved }: {
  data: FinanceData;
  subscriptionMonthlyCents: number | null;
  busy: boolean;
  onReset: () => void;
  onSaved: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [budget, setBudget] = useState(data.monthlyBudgetCents === null ? "" : moneyInput(data.monthlyBudgetCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  let totalMonthlyCents: number | null = null;
  try {
    const amount = budget.trim() === "" ? null : parseMoney(budget);
    if (amount !== null && amount >= 0 && subscriptionMonthlyCents !== null)
      totalMonthlyCents = amount + subscriptionMonthlyCents;
  } catch {
    totalMonthlyCents = null;
  }
  async function saveBudget(event: FormEvent) {
    event.preventDefault();
    if (busy || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const amount = budget.trim() === "" ? null : parseMoney(budget);
      if (amount !== null && amount < 0) throw new Error("finance.budget.nonnegative");
      await financeApi.setMonthlyBudget(amount);
      await onSaved();
      setSaved(true);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={saveBudget} className={`${panel} space-y-5`}>
        <div>
          <h2 className="text-lg font-semibold">{t("finance.budget.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("finance.budget.help")}</p>
        </div>
        <div className="max-w-sm">
          <Field label={t("finance.budget.amount")} inputMode="decimal" value={budget} disabled={busy || saving} placeholder="0,00" onChange={(event) => { setBudget(event.target.value); setSaved(false); }} />
        </div>
        <dl className="max-w-sm space-y-3 text-sm" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">{t("finance.budget.fixedCosts")}</dt>
            <dd className="tabular-nums">{money(subscriptionMonthlyCents)}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-3">
            <dt className="text-muted-foreground">{t("finance.budget.monthlyTotal")}</dt>
            <dd className="font-medium tabular-nums">{money(totalMonthlyCents)}</dd>
          </div>
        </dl>
        {error && <Notice error>{error}</Notice>}
        {saved && <Notice>{t("finance.budget.saved")}</Notice>}
        <Action type="submit" disabled={busy || saving} className="bg-brand text-black hover:bg-brand-hover">{t(saving ? "Saving..." : "Save")}</Action>
      </form>
      <section className={`${panel} space-y-5`}>
        <div>
          <h2 className="text-lg font-semibold">{t("finance.settings.resetTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("finance.settings.resetHelp")}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("finance.settings.scope", { accounts: String(data.accounts.length), balances: String(data.observations.length), goals: String(data.goals.length) })}</p>
        <div className="max-w-sm">
          <Field
            label={t("finance.settings.typeConfirmation")}
            value={confirmation}
            disabled={busy || saving}
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        <Action variant="outline" className="border-destructive/40 text-destructive hover:text-destructive" disabled={busy || saving || confirmation !== t("finance.settings.confirmWord")} onClick={onReset}>
          {t("finance.settings.resetTitle")}
        </Action>
      </section>
    </div>
  );
}
