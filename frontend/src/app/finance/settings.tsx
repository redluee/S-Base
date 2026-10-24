"use client";

import { useState } from "react";
import type { FinanceData } from "@backend/types/finance";
import { t } from "@/lib/lang";
import { Action, Field, panel } from "./ui";

export function FinanceSettings({ data, busy, onReset }: {
  data: FinanceData;
  busy: boolean;
  onReset: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  return (
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
          disabled={busy}
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </div>
      <Action variant="outline" className="border-destructive/40 text-destructive hover:text-destructive" disabled={busy || confirmation !== t("finance.settings.confirmWord")} onClick={onReset}>
        {t("finance.settings.resetTitle")}
      </Action>
    </section>
  );
}
