"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Download,
  Moon,
  Power,
  PowerOff,
  RotateCw,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  ApiError,
  type PulseStats,
  type ShutdownSchedule,
  type SystemUpdateState,
  type UpdatePhase,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialogRoot,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogActions,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";

type Notify = (text: string, type?: "success" | "error") => void;

const POLL_INTERVAL_MS = 1500;
const LOG_LINES_SHOWN = 200;

const UPDATE_STEPS: { phase: UpdatePhase; label: string }[] = [
  { phase: "repositories", label: "Repositories laden" },
  { phase: "resolving", label: "Afhankelijkheden oplossen" },
  { phase: "downloading", label: "Downloaden" },
  { phase: "installing", label: "Installeren" },
  { phase: "cleanup", label: "Opruimen" },
  { phase: "verifying", label: "Verifiëren" },
  { phase: "complete", label: "Klaar" },
];

const BTN = "h-11 px-4 text-sm font-medium rounded-lg";
const BTN_OUTLINE = `${BTN} border-border bg-transparent text-foreground hover:bg-white/5`;
const BTN_DESTRUCTIVE = `${BTN} border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10`;
const FOCUS = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-4 py-3 sm:px-5">
      <dt className="text-[0.8rem] font-medium tracking-[0.01em] text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function SystemPanel({
  stats,
  initialShutdownSchedule,
  initialSystemUpdate,
  notify,
}: {
  stats: PulseStats;
  initialShutdownSchedule?: ShutdownSchedule;
  initialSystemUpdate?: SystemUpdateState;
  notify: Notify;
}) {
  const [shutdownSchedule, setShutdownSchedule] = useState<ShutdownSchedule | null>(initialShutdownSchedule ?? null);
  const [shutdownTimeInput, setShutdownTimeInput] = useState<string>(initialShutdownSchedule?.time ?? "01:00");
  const [isSavingShutdown, setIsSavingShutdown] = useState(false);
  const [isShutdownNowOpen, setIsShutdownNowOpen] = useState(false);
  const [isShuttingDownNow, setIsShuttingDownNow] = useState(false);

  const [update, setUpdate] = useState<SystemUpdateState | null>(initialSystemUpdate ?? null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isStartingUpdate, setIsStartingUpdate] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const [isRebootOpen, setIsRebootOpen] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootRequested, setRebootRequested] = useState(false);

  const updateRunning = update?.status === "running";

  useEffect(() => {
    if (!updateRunning) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const next = await api.pulse.getSystemUpdate();
        if (!cancelled) setUpdate(next);
      } catch {
        // transient failure, retry on next tick
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [updateRunning]);

  const logLength = update?.log.length ?? 0;
  useEffect(() => {
    if (showLog && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [showLog, logLength]);

  const handleSaveShutdownTime = async () => {
    setIsSavingShutdown(true);
    try {
      const updated = await api.pulse.updateShutdownSchedule({ time: shutdownTimeInput });
      setShutdownSchedule(updated);
      notify(t("Shutdown schedule updated"));
    } catch {
      notify(t("Opslaan mislukt"), "error");
    } finally {
      setIsSavingShutdown(false);
    }
  };

  const handleToggleShutdownEnabled = async () => {
    if (!shutdownSchedule) return;
    setIsSavingShutdown(true);
    try {
      const updated = await api.pulse.updateShutdownSchedule({ enabled: !shutdownSchedule.enabled });
      setShutdownSchedule(updated);
      notify(t("Shutdown schedule updated"));
    } catch {
      notify(t("Opslaan mislukt"), "error");
    } finally {
      setIsSavingShutdown(false);
    }
  };

  const handleToggleBlockShutdown = async () => {
    if (!shutdownSchedule) return;
    setIsSavingShutdown(true);
    try {
      const updated = shutdownSchedule.isBlocked
        ? await api.pulse.unblockShutdown()
        : await api.pulse.blockShutdown();
      setShutdownSchedule(updated);
      notify(shutdownSchedule.isBlocked ? t("Shutdown unblocked") : t("Shutdown blocked for tonight"));
    } catch {
      notify(t("Opslaan mislukt"), "error");
    } finally {
      setIsSavingShutdown(false);
    }
  };

  const handleShutdownNow = async () => {
    setIsShuttingDownNow(true);
    try {
      await api.pulse.shutdownNow();
      notify(t("Shutdown initiated"));
      setIsShutdownNowOpen(false);
    } catch {
      notify(t("Failed to initiate shutdown"), "error");
    } finally {
      setIsShuttingDownNow(false);
    }
  };

  const handleStartUpdate = async () => {
    setIsStartingUpdate(true);
    try {
      const next = await api.pulse.startSystemUpdate();
      setUpdate(next);
      setIsUpdateOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        notify(t("Er loopt al een update"), "error");
        setIsUpdateOpen(false);
        try {
          setUpdate(await api.pulse.getSystemUpdate());
        } catch {
          // ignore
        }
      } else {
        notify(t("Bijwerken starten mislukt"), "error");
      }
    } finally {
      setIsStartingUpdate(false);
    }
  };

  const handleReboot = async () => {
    setIsRebooting(true);
    try {
      await api.pulse.reboot();
      setRebootRequested(true);
      setIsRebootOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        notify(t("Herstarten is niet mogelijk tijdens een update"), "error");
        setIsRebootOpen(false);
      } else {
        notify(t("Herstarten mislukt"), "error");
      }
    } finally {
      setIsRebooting(false);
    }
  };

  const phase = update?.phase ?? null;
  const currentStep = phase ? UPDATE_STEPS.findIndex((s) => s.phase === phase) : -1;
  const progress = update?.progress && update.progress.total > 0 ? update.progress : null;
  const progressPct = progress ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;
  const succeeded = update?.status === "success";
  const failed = update?.status === "failed";
  const logLines = (update?.log ?? []).slice(-LOG_LINES_SHOWN);
  const showUpdatePanel = updateRunning || succeeded || failed;

  return (
    <section aria-labelledby="pulse-system-heading" className="mb-10">
      <h2 id="pulse-system-heading" className="mb-3 text-lg font-semibold text-foreground">
        {t("Systeem")}
      </h2>

      <dl className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-foreground/10 ring-1 ring-foreground/10 sm:grid-cols-4">
        <StatItem label={t("Total Users")} value={stats.totalUsers} />
        <StatItem label={t("Active Users")} value={stats.activeUsers} />
        <StatItem label={t("Paused Accounts")} value={stats.pausedUsers} />
        <StatItem label={t("Total Permissions")} value={stats.totalPermissions} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        {shutdownSchedule && (
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
        )}

        <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h3 className="text-base font-medium leading-tight text-foreground">{t("Systeemacties")}</h3>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUpdateOpen(true)}
              disabled={updateRunning || isStartingUpdate}
              className={BTN_OUTLINE}
            >
              <Download aria-hidden="true" />
              {updateRunning ? t("Bijwerken...") : t("Systeem bijwerken")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRebootOpen(true)}
              disabled={updateRunning || isRebooting || rebootRequested}
              title={updateRunning ? t("Herstarten kan niet tijdens een update") : undefined}
              className={BTN_OUTLINE}
            >
              <RotateCw aria-hidden="true" />
              {t("Herstarten")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsShutdownNowOpen(true)}
              disabled={isShuttingDownNow}
              className={BTN_DESTRUCTIVE}
            >
              <PowerOff aria-hidden="true" />
              {t("Nu afsluiten")}
            </Button>
          </div>

          {rebootRequested && (
            <p role="status" className="flex items-start gap-2 text-sm text-foreground">
              <RotateCw className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin text-muted-foreground" aria-hidden="true" />
              {t("De server wordt herstart. Minecraft-servers zijn gestopt; deze pagina is zo weer bereikbaar.")}
            </p>
          )}

          {showUpdatePanel && (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4" aria-live="polite">
              {updateRunning && (
                <>
                  <ol aria-label={t("Voortgang systeemupdate")} className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {UPDATE_STEPS.map((step, i) => {
                      const done = currentStep > i;
                      const active = currentStep === i;
                      return (
                        <li
                          key={step.phase}
                          aria-current={active ? "step" : undefined}
                          className={`flex min-h-6 items-center gap-2 text-sm ${
                            active ? "font-medium text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"
                          }`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded-full border text-[0.6rem] ${
                              active ? "border-brand" : done ? "border-white/30" : "border-white/15"
                            }`}
                            aria-hidden="true"
                          >
                            {done ? (
                              <Check className="size-2.5" />
                            ) : active ? (
                              <span className="size-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
                            ) : null}
                          </span>
                          {t(step.label)}
                        </li>
                      );
                    })}
                  </ol>
                  {currentStep < 0 && <p className="text-sm text-muted-foreground">{t("Bezig met voorbereiden...")}</p>}
                  {progress && (
                    <div className="flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-label={t("Voortgang systeemupdate")}
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.current}
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                      >
                        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {progress.current}/{progress.total}
                      </span>
                    </div>
                  )}
                </>
              )}

              {succeeded && (
                <p role="status" className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Check className="size-4 text-brand" aria-hidden="true" />
                  {phase === "nothing" ? t("Niets bij te werken") : t("Bijgewerkt")}
                </p>
              )}

              {failed && (
                <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">{t("Bijwerken mislukt")}</p>
                    <p className="mt-0.5 break-words text-destructive/90">{update?.error || t("Onbekende fout")}</p>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setShowLog((v) => !v)}
                  aria-expanded={showLog}
                  aria-controls="pulse-update-log"
                  className={`-ml-2 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground ${FOCUS}`}
                >
                  <ChevronDown className={`size-4 transition-transform ${showLog ? "rotate-180" : ""}`} aria-hidden="true" />
                  {showLog ? t("Log verbergen") : t("Log tonen")}
                </button>
                {showLog && (
                  <pre
                    id="pulse-update-log"
                    ref={logRef}
                    tabIndex={0}
                    className={`mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-muted-foreground ${FOCUS}`}
                  >
                    {logLines.length > 0 ? logLines.join("\n") : t("Nog geen uitvoer.")}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialogRoot
        open={isShutdownNowOpen}
        onOpenChange={(open) => {
          if (!isShuttingDownNow) setIsShutdownNowOpen(open);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <PowerOff className="size-4 text-destructive" aria-hidden="true" />
            {t("Shut down server now?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
            {t("This will immediately stop all Minecraft servers and power off the Fedora host. This cannot be undone.")}
          </AlertDialogDescription>
          <AlertDialogActions className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <AlertDialogClose
              render={
                <Button variant="ghost" disabled={isShuttingDownNow} className={`${BTN} text-muted-foreground`}>
                  {t("Cancel")}
                </Button>
              }
            />
            <Button onClick={handleShutdownNow} disabled={isShuttingDownNow} className={`${BTN} bg-destructive text-[#111] hover:bg-destructive/85`}>
              {isShuttingDownNow ? t("Shutting down...") : t("Shutdown Now")}
            </Button>
          </AlertDialogActions>
        </AlertDialogPopup>
      </AlertDialogRoot>

      <AlertDialogRoot
        open={isRebootOpen}
        onOpenChange={(open) => {
          if (!isRebooting) setIsRebootOpen(open);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <RotateCw className="size-4 text-destructive" aria-hidden="true" />
            {t("Server herstarten?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
            {t("Alle Minecraft-servers worden gestopt en daarna wordt de hele server opnieuw opgestart. Deze pagina is tijdelijk niet bereikbaar.")}
          </AlertDialogDescription>
          <AlertDialogActions className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <AlertDialogClose
              render={
                <Button variant="ghost" disabled={isRebooting} className={`${BTN} text-muted-foreground`}>
                  {t("Cancel")}
                </Button>
              }
            />
            <Button onClick={handleReboot} disabled={isRebooting} className={`${BTN} bg-destructive text-[#111] hover:bg-destructive/85`}>
              {isRebooting ? t("Herstarten...") : t("Nu herstarten")}
            </Button>
          </AlertDialogActions>
        </AlertDialogPopup>
      </AlertDialogRoot>

      <AlertDialogRoot
        open={isUpdateOpen}
        onOpenChange={(open) => {
          if (!isStartingUpdate) setIsUpdateOpen(open);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Download className="size-4" aria-hidden="true" />
            {t("Systeem bijwerken?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
            {t("Dit voert een systeemupdate (dnf) uit op de server. Dit kan enkele minuten duren.")}
          </AlertDialogDescription>
          <AlertDialogActions className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <AlertDialogClose
              render={
                <Button variant="ghost" disabled={isStartingUpdate} className={`${BTN} text-muted-foreground`}>
                  {t("Cancel")}
                </Button>
              }
            />
            <Button onClick={handleStartUpdate} disabled={isStartingUpdate} className={`${BTN} bg-brand text-[#111] hover:bg-brand-hover`}>
              {isStartingUpdate ? t("Bijwerken...") : t("Bijwerken starten")}
            </Button>
          </AlertDialogActions>
        </AlertDialogPopup>
      </AlertDialogRoot>
    </section>
  );
}
