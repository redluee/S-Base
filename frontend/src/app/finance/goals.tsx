"use client";

import { useState, type FormEvent } from "react";
import type { FinanceData, FinanceGoal } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import {
  dateLabel,
  money,
  moneyInput,
  parseMoney,
  savingsState,
} from "@/lib/finance";
import { t } from "@/lib/lang";
import { Action, Field, Notice, errorText, panel, selectClass } from "./ui";
import { GoalForm } from "./goal-form";

type SavingsState = ReturnType<typeof savingsState>;
function AllocationForm({
  goal,
  data,
  savings,
  onSaved,
}: {
  goal: FinanceGoal;
  data: FinanceData;
  savings: SavingsState;
  onSaved: () => Promise<void>;
}) {
  const initialAccount = savings.accounts[0]?.id ?? 0;
  const existing = (id: number) =>
    data.allocations.find((a) => a.goalId === goal.id && a.accountId === id)
      ?.amountCents ?? 0;
  const [accountId, setAccountId] = useState(initialAccount),
    [value, setValue] = useState(moneyInput(existing(initialAccount)));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const account = savings.accounts.find((a) => a.id === accountId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const amount = parseMoney(value);
      if (amount < 0) throw new Error("finance.nonnegativeAllocation");
      await financeApi.allocate(goal.id, accountId, amount);
      await onSaved();
      setSaved(true);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  if (!savings.accounts.length)
    return <Notice>{t("finance.addSavingsFirst")}</Notice>;
  return (
    <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">
        {t("finance.allocationEditHelp")}
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground">
          {t("finance.fromAccount")}
          <select
            className={selectClass}
            value={accountId}
            disabled={busy}
            onChange={(e) => {
              const id = Number(e.target.value);
              setAccountId(id);
              setValue(moneyInput(existing(id)));
              setSaved(false);
            }}
          >
            {savings.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.archived ? ` · ${t("finance.archived")}` : ""}
              </option>
            ))}
          </select>
        </label>
        <Field
          label={t("finance.newAllocation")}
          inputMode="decimal"
          required
          disabled={busy}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
        <Action variant="outline" type="submit" disabled={busy}>
          {t(busy ? "Saving..." : "finance.setAllocation")}
        </Action>
      </div>
      {account && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {t("finance.unallocated")}: {money(account.unallocatedCents)} ·{" "}
          {t("finance.allocatedToGoal")}: {money(existing(accountId))}
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
      {saved && <Notice>{t("finance.allocationSaved")}</Notice>}
    </form>
  );
}
export function Goals({
  data,
  onSaved,
  onDelete,
}: {
  data: FinanceData;
  onSaved: () => Promise<void>;
  onDelete: (goal: FinanceGoal) => void;
}) {
  const [editing, setEditing] = useState<FinanceGoal | "new" | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const savings = savingsState(data);
  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("finance.goals")}</h2>
          <Action variant="outline" onClick={() => setEditing("new")}>
            {t("finance.newGoal")}
          </Action>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t("finance.goalsHelp")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("finance.goalsAsOf", { date: dateLabel(data.today) })}
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("finance.allocated")}
            </dt>
            <dd className="mt-2 text-xl tabular-nums">
              {money(savings.allocatedCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("finance.unallocated")}
            </dt>
            <dd className="mt-2 text-xl tabular-nums">
              {money(savings.unallocatedCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("finance.shortfall")}
            </dt>
            <dd
              className={`mt-2 text-xl tabular-nums ${savings.shortfallCents > 0 ? "text-destructive" : ""}`}
            >
              {money(savings.shortfallCents)}
            </dd>
          </div>
        </dl>
        {(savings.shortfallCents > 0 || savings.unknown) && (
          <div className="mt-5">
            <Notice error>{t("finance.shortfallHelp")}</Notice>
          </div>
        )}
        <details className="mt-5 border-t border-border pt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">
            {t("finance.savingsAvailability")}
          </summary>
          <ul className="divide-y divide-border">
            {savings.accounts.map((a) => (
              <li key={a.id} className="space-y-2 py-3 text-sm">
                <p className="break-words font-medium">
                  {a.name}
                  {a.archived ? ` · ${t("finance.archivedIncluded")}` : ""}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t("finance.balance")}: {money(a.balanceCents)} ·{" "}
                  {dateLabel(a.lastDate)}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t("finance.allocated")}: {money(a.allocatedCents)} ·{" "}
                  {t("finance.unallocated")}: {money(a.unallocatedCents)} ·{" "}
                  {t("finance.shortfall")}: {money(a.shortfallCents)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      </section>
      {!data.goals.length && <Notice>{t("finance.noGoals")}</Notice>}
      {data.goals.map((goal) => {
        const allocations = data.allocations.filter(
            (a) => a.goalId === goal.id,
          ),
          allocated = allocations.reduce((sum, a) => sum + a.amountCents, 0);
        const percent = Math.min(100, (allocated / goal.targetCents) * 100);
        const affected = allocations.some(
          (a) =>
            savings.accounts.find((account) => account.id === a.accountId)
              ?.shortfallCents,
        );
        return (
          <section key={goal.id} className={panel} aria-label={goal.name}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="min-w-0 break-words text-lg font-semibold">
                {goal.name}
              </h3>
              <div className="flex gap-1">
                <Action variant="ghost" onClick={() => setEditing(goal)}>
                  {t("Edit")}
                </Action>
                <Action
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => onDelete(goal)}
                >
                  {t("Delete")}
                </Action>
              </div>
            </div>
            {goal.targetDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("finance.targetDateLabel")}: {dateLabel(goal.targetDate)}
              </p>
            )}
            <p className="mt-4 break-words text-xl tabular-nums">
              {money(allocated)}{" "}
              <span className="text-sm text-muted-foreground">
                / {money(goal.targetCents)}
              </span>
            </p>
            <div
              role="progressbar"
              aria-label={t("finance.goalProgress")}
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-zinc-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("finance.remaining")}:{" "}
              {money(Math.max(0, goal.targetCents - allocated))} ·{" "}
              {percent.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%{" "}
              {t("finance.allocatedLabel")}
            </p>
            {affected && (
              <p className="mt-3 text-sm text-destructive">
                {t("finance.goalUncovered")}
              </p>
            )}
            {allocations.length > 0 && (
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {allocations.map((a) => (
                  <li
                    key={a.accountId}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <span className="break-words">
                      {
                        data.accounts.find(
                          (account) => account.id === a.accountId,
                        )?.name
                      }
                    </span>
                    <span className="tabular-nums">{money(a.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Action
              variant="outline"
              className="mt-4"
              aria-expanded={expanded === goal.id}
              onClick={() => setExpanded(expanded === goal.id ? null : goal.id)}
            >
              {t("finance.manageAllocation")}
            </Action>
            {expanded === goal.id && (
              <div className="mt-4">
                <AllocationForm
                  goal={goal}
                  data={data}
                  savings={savings}
                  onSaved={onSaved}
                />
              </div>
            )}
          </section>
        );
      })}
      {editing && (
        <GoalForm
          goal={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
