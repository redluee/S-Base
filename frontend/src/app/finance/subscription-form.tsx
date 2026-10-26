"use client";

import { useState, type FormEvent } from "react";
import type { FinanceAccount, FinanceSubscription } from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Action, Field, Notice, errorText, panel, selectClass } from "./ui";

export type SubscriptionAction = "rename" | "merge" | "exclude" | "deactivate" | "reactivate";

export function SubscriptionForm({ entry, action, entries, accounts, onClose, onSaved }: {
  entry: FinanceSubscription;
  action: SubscriptionAction;
  entries: FinanceSubscription[];
  accounts: FinanceAccount[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(entry.name);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = t(`finance.subscriptions.${action}`);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "rename") await financeApi.renameSubscription(entry.id, name);
      else if (action === "merge") await financeApi.mergeSubscriptions(entry.id, targetId);
      else if (action === "deactivate" || action === "reactivate") await financeApi.setSubscriptionInactive(entry.id, action === "deactivate");
      else await financeApi.excludeSubscription(entry.id);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalOverlay open onClose={() => { if (!busy) onClose(); }} label={title}>
      <form onSubmit={submit} aria-busy={busy} className={`${panel} flex max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto`}>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="break-words text-sm text-muted-foreground">{entry.name}</p>
        {action === "rename" && <Field label={t("finance.subscriptions.name")} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus disabled={busy} />}
        {action === "merge" && <>
          <label className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.subscriptions.mergeInto")}
            <select className={selectClass} value={targetId} onChange={(event) => setTargetId(event.target.value)} required disabled={busy} autoFocus>
              <option value="">{t("finance.subscriptions.choose")}</option>
              {entries.filter((target) => target.id !== entry.id).map((target) => <option key={target.id} value={target.id}>{target.name} · {target.accountIds.map((id) => accounts.find((account) => account.id === id)?.name).filter(Boolean).join(" / ")}</option>)}
            </select>
          </label>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("finance.subscriptions.mergeHelp")}</p>
        </>}
        {action === "exclude" && <p className="text-sm leading-relaxed text-muted-foreground">{t("finance.subscriptions.excludeHelp")}</p>}
        {(action === "deactivate" || action === "reactivate") && <p className="text-sm leading-relaxed text-muted-foreground">{t(`finance.subscriptions.${action}Help`)}</p>}
        {error && <Notice error>{error}</Notice>}
        <div className="flex flex-wrap justify-end gap-2">
          <Action type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancel")}</Action>
          <Action type="submit" variant={action === "exclude" ? "destructive" : "default"} disabled={busy || (action === "merge" && !targetId)}>
            {t(busy ? "Saving..." : action === "rename" ? "Save" : `finance.subscriptions.${action}`)}
          </Action>
        </div>
      </form>
    </ModalOverlay>
  );
}
