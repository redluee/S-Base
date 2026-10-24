"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import type { FinanceAccount } from "@backend/types/finance";
import { financeAccountIcons, type FinanceAccountIcon } from "@backend/types/finance-icons";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { accountIconComponents } from "./account-icon";
import { Action, Notice, errorText, panel } from "./ui";

export function AccountIconPicker({ account, onClose, onSaved }: {
  account: FinanceAccount;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<FinanceAccountIcon | null>(account.icon ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      await financeApi.setAccountIcon(account.id, selected);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalOverlay open onClose={() => { if (!busy) onClose(); }} label={t("finance.accountIconFor", { name: account.name })}>
      <div className={`${panel} flex max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto`}>
        <h2 className="break-words text-lg font-semibold">{t("finance.accountIconFor", { name: account.name })}</h2>
        <div role="group" aria-label={t("finance.accountIcon")} className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {financeAccountIcons.map((icon) => {
            const Icon = accountIconComponents[icon];
            return (
              <button key={icon} type="button" disabled={busy} aria-label={t(`finance.icon.${icon}`)} title={t(`finance.icon.${icon}`)} aria-pressed={selected === icon} onClick={() => setSelected(icon)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 ${selected === icon ? "border-brand bg-muted text-brand" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <Action variant="outline" disabled={busy} aria-pressed={selected === null} onClick={() => setSelected(null)}>
          <Ban className="size-4" aria-hidden="true" />{t("finance.noIcon")}
        </Action>
        {error && <Notice error>{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Action variant="outline" disabled={busy} onClick={onClose}>{t("Cancel")}</Action>
          <Action disabled={busy} className="bg-brand text-black hover:bg-brand-hover" onClick={() => void save()}>{t(busy ? "Saving..." : "Save")}</Action>
        </div>
      </div>
    </ModalOverlay>
  );
}
