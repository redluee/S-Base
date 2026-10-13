"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  PowerOff,
  RotateCw,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  ApiError,
  type PulseStats,
  type ShutdownSchedule,
  type SystemUpdateState,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BTN, BTN_OUTLINE, BTN_DESTRUCTIVE, type Notify } from "./system-panel-styles";
import { ShutdownCard } from "./shutdown-card";
import { UpdateProgress, UPDATE_STEPS } from "./update-progress";
import {
  AlertDialogRoot,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogActions,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";


const POLL_INTERVAL_MS = 1500;
const LOG_LINES_SHOWN = 200;



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
          <ShutdownCard
            shutdownSchedule={shutdownSchedule}
            shutdownTimeInput={shutdownTimeInput}
            setShutdownTimeInput={setShutdownTimeInput}
            isSavingShutdown={isSavingShutdown}
            handleSaveShutdownTime={handleSaveShutdownTime}
            handleToggleBlockShutdown={handleToggleBlockShutdown}
            handleToggleShutdownEnabled={handleToggleShutdownEnabled}
          />
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
            <UpdateProgress
              update={update}
              updateRunning={updateRunning}
              currentStep={currentStep}
              progress={progress}
              progressPct={progressPct}
              succeeded={succeeded}
              failed={failed}
              phase={phase}
              showLog={showLog}
              setShowLog={setShowLog}
              logRef={logRef}
              logLines={logLines}
            />
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
