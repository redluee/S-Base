"use client";

import { Clock, Moon, Power, ShieldAlert, Unlock } from "lucide-react";
import { t } from "@/lib/lang";
import type { ShutdownSchedule } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BTN, BTN_OUTLINE } from "./system-panel-styles";

export function ShutdownCard({
  shutdownSchedule,
  shutdownTimeInput,
  setShutdownTimeInput,
  isSavingShutdown,
  handleSaveShutdownTime,
  handleToggleBlockShutdown,
  handleToggleShutdownEnabled,
}: {
  shutdownSchedule: ShutdownSchedule;
  shutdownTimeInput: string;
  setShutdownTimeInput: (value: string) => void;
  isSavingShutdown: boolean;
  handleSaveShutdownTime: () => void;
  handleToggleBlockShutdown: () => void;
  handleToggleShutdownEnabled: () => void;
}) {
  return (
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Moon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-base font-medium leading-tight text-foreground">{t("Server Shutdown")}</h3>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {!shutdownSchedule.enabled
                  ? t("Automatic server shutdown is disabled")
                  : shutdownSchedule.isBlocked
                  ? t("Server shutdown is blocked for tonight")
                  : `${t("Next shutdown")}: ${shutdownSchedule.time} (${shutdownSchedule.minutesUntilShutdown ?? 0}m)`}
              </p>
            </div>
          </div>
          {!shutdownSchedule.enabled ? (
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t("Disabled")}
            </span>
          ) : shutdownSchedule.isBlocked ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
              <ShieldAlert className="size-3" aria-hidden="true" />
              {t("Blocked")}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
              {t("Active")}
            </span>
          )}
        </div>
  
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-input/30 px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{t("Afsluitingstijd")}</span>
            <input
              type="time"
              value={shutdownTimeInput}
              onChange={(e) => setShutdownTimeInput(e.target.value)}
              disabled={isSavingShutdown}
              className="w-24 bg-transparent font-mono text-sm text-foreground outline-none"
            />
          </label>
          {shutdownTimeInput !== shutdownSchedule.time && (
            <Button onClick={handleSaveShutdownTime} disabled={isSavingShutdown} className={`${BTN} bg-brand text-[#111] hover:bg-brand-hover`}>
              {t("Save Time")}
            </Button>
          )}
        </div>
  
        <div className="flex flex-wrap gap-2">
          {shutdownSchedule.enabled && (
            <Button variant="outline" onClick={handleToggleBlockShutdown} disabled={isSavingShutdown} className={BTN_OUTLINE}>
              {shutdownSchedule.isBlocked ? (
                <>
                  <Unlock aria-hidden="true" />
                  {t("Unblock Shutdown")}
                </>
              ) : (
                <>
                  <ShieldAlert aria-hidden="true" />
                  {t("Block Tonight")}
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={handleToggleShutdownEnabled} disabled={isSavingShutdown} className={BTN_OUTLINE}>
            <Power aria-hidden="true" />
            {shutdownSchedule.enabled ? t("Uitschakelen") : t("Inschakelen")}
          </Button>
        </div>
  
        <p className="text-[0.8rem] text-muted-foreground">{t("Minecraft player warnings and safe shutdown active")}</p>
      </div>
  );
}
