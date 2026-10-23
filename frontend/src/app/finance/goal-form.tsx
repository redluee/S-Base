"use client";

import { useState, type FormEvent } from "react";
import type { FinanceGoal } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { moneyInput, parseMoney } from "@/lib/finance";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Action, Field, Notice, errorText, panel } from "./ui";

export function GoalForm({
  goal,
  onClose,
  onSaved,
}: {
  goal?: FinanceGoal;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(goal?.name ?? ""),
    [target, setTarget] = useState(goal ? moneyInput(goal.targetCents) : ""),
    [date, setDate] = useState(goal?.targetDate ?? "");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        name,
        targetCents: parseMoney(target),
        targetDate: date || null,
      };
      if (body.targetCents <= 0) throw new Error("finance.positiveTarget");
      if (goal) await financeApi.updateGoal(goal.id, body);
      else await financeApi.createGoal(body);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalOverlay
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      label={t(goal ? "finance.editGoal" : "finance.newGoal")}
    >
      <form
        onSubmit={submit}
        className={`${panel} flex max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto`}
      >
        <h2 className="text-lg font-semibold">
          {t(goal ? "finance.editGoal" : "finance.newGoal")}
        </h2>
        <Field
          label={t("finance.goalName")}
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Field
          label={t("finance.targetAmount")}
          inputMode="decimal"
          value={target}
          required
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0,00"
        />
        <Field
          label={t("finance.targetDate")}
          type="date"
          min="1900-01-01"
          value={date}
          onInput={(e) => setDate(e.currentTarget.value)}
        />
        {error && <Notice error>{error}</Notice>}
        <div className="flex flex-wrap justify-end gap-2">
          <Action
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            {t("Cancel")}
          </Action>
          <Action
            type="submit"
            disabled={busy}
            className="bg-brand text-black hover:bg-brand-hover"
          >
            {t(busy ? "Saving..." : "Save")}
          </Action>
        </div>
      </form>
    </ModalOverlay>
  );
}
