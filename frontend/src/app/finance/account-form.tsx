"use client";

import { useState, type FormEvent } from "react";
import type {
  FinanceAccount,
  FinanceAccountType,
  FinanceData,
} from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { moneyInput, parseMoney } from "@/lib/finance";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Action, Field, Notice, errorText, panel, selectClass } from "./ui";

export function AccountForm({
  account,
  data,
  onClose,
  onSaved,
}: {
  account?: FinanceAccount;
  data: FinanceData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const opening = data.observations.find(
    (o) => o.accountId === account?.id && o.date === account?.openingDate,
  );
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState(account?.bank ?? "");
  const [type, setType] = useState<FinanceAccountType>(
    account?.type ?? "current",
  );
  const [date, setDate] = useState(account?.openingDate ?? data.today);
  const [amount, setAmount] = useState(
    opening ? moneyInput(opening.balanceCents) : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        name,
        bank: bank || null,
        type,
        openingDate: date,
        openingBalanceCents: parseMoney(amount),
      };
      if (account) await financeApi.updateAccount(account.id, body);
      else await financeApi.createAccount(body);
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
      label={t(account ? "finance.editAccount" : "finance.newAccount")}
    >
      <form
        onSubmit={submit}
        className={`${panel} flex max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto`}
      >
        <h2 className="text-lg font-semibold">
          {t(account ? "finance.editAccount" : "finance.newAccount")}
        </h2>
        <Field
          label={t("finance.accountName")}
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Field
          label={t("finance.bank")}
          maxLength={120}
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          {t("finance.accountType")}
          <select
            className={selectClass}
            value={type}
            onChange={(e) => setType(e.target.value as FinanceAccountType)}
          >
            <option value="current">{t("finance.current")}</option>
            <option value="savings">{t("finance.savings")}</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("finance.openingDate")}
            type="date"
            min="1900-01-01"
            max={data.today}
            required
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
          />
          <Field
            label={t("finance.openingBalance")}
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(account ? "finance.accountEditHelp" : "finance.openingHelp")}
        </p>
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
