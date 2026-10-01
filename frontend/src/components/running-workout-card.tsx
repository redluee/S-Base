"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { InlineAlert } from "@/components/ui/inline-alert";
import { sessionElapsedSeconds } from "@/lib/workout-time";
import { clearOfflineSession } from "@/lib/offline-workout";
import { clearSetTimerSnapshot } from "@/lib/set-timer";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { DumbbellIcon } from "@/components/icons";
import { Play, CheckCircle2, Trash2, Timer } from "lucide-react";
import type { WorkoutSession } from "@backend/types/shared";

function parseSessionDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
}

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function RunningWorkoutCard({
  session,
  onDiscard,
  compact = false,
}: {
  session: WorkoutSession;
  onDiscard?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isPaused = Boolean(session.pausedAt);
  const sessionHref = `/workouts/session/${session.sessionId}`;
  const continueLabel = isPaused ? t("Hervatten") : t("Doorgaan");

  useEffect(() => {
    const updateElapsed = () => {
      setElapsed(
        sessionElapsedSeconds(
          { ...session, startedAt: parseSessionDate(session.startedAt).toISOString() },
          Date.now()
        )
      );
    };

    updateElapsed();
    if (isPaused) return;
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [session, isPaused]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.workouts.sessions.delete(session.sessionId);
      clearOfflineSession(session.sessionId);
      clearSetTimerSnapshot(session.sessionId);
      setShowConfirmDelete(false);
      if (onDiscard) {
        onDiscard();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
      setDeleteError(t("Workout verwijderen mislukt. Probeer het opnieuw."));
    } finally {
      setIsDeleting(false);
    }
  };

  const startTimeFormatted = React.useMemo(() => {
    const date = parseSessionDate(session.startedAt);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  }, [session.startedAt]);

  if (compact) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-brand/40 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-brand/15 flex items-center justify-center text-brand shrink-0">
              <DumbbellIcon className="size-4" />
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                {isPaused ? t("Workout gepauzeerd") : t("Lopende workout")}
              </span>
              <h3 className="font-semibold text-sm text-foreground truncate">
                {session.name || t("Workout Session")}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-brand tabular-nums">
              <Timer className="size-3.5" aria-hidden="true" />
              <span>{formatElapsedTime(elapsed)}</span>
            </div>
            <Button
              render={<Link href={sessionHref} />}
              className="bg-brand text-zinc-950 hover:bg-brand-hover font-semibold text-sm min-h-11 px-4"
            >
              <span>{continueLabel}</span>
              <Play className="size-3 ml-1 fill-zinc-950" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-brand/40 p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-brand uppercase tracking-wider mb-1.5">
              {isPaused ? t("Workout gepauzeerd") : t("Workout in uitvoering")}
            </span>
            <h2 className="font-semibold text-xl sm:text-2xl text-foreground tracking-tight break-words">
              {session.name || t("Workout Session")}
            </h2>
          </div>

          <div
            role="timer"
            aria-label={t("Verstreken tijd")}
            className="flex items-center gap-1.5 bg-brand/10 text-brand font-bold text-sm sm:text-base px-3 py-1.5 rounded-lg shrink-0 tabular-nums"
          >
            <Timer className="size-4" aria-hidden="true" />
            <span>{formatElapsedTime(elapsed)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {session.exerciseCount !== undefined && (
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-foreground font-medium">
              {session.exerciseCount} {session.exerciseCount === 1 ? t("oefening") : t("oefeningen")}
            </span>
          )}
          {session.completedSetsCount !== undefined && session.totalSetsCount !== undefined && (
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-foreground font-medium">
              {session.completedSetsCount} / {session.totalSetsCount} {t("sets voltooid")}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground font-medium">
            {t("Gestart om")} {startTimeFormatted}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
            <Button
              render={<Link href={sessionHref} />}
              className="min-h-11 bg-brand text-zinc-950 hover:bg-brand-hover font-semibold text-sm"
            >
              <Play className="size-4 mr-1.5 fill-zinc-950" />
              {continueLabel}
            </Button>
            <Button
              render={<Link href={`${sessionHref}?afronden=1`} />}
              variant="outline"
              className="min-h-11 font-semibold text-sm"
            >
              <CheckCircle2 className="size-4 mr-1.5 text-brand" />
              {t("Workout afronden")}
            </Button>
          </div>

          {showConfirmDelete ? (
            <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto sm:justify-end">
              <span className="text-muted-foreground font-medium">{t("Zeker weten?")}</span>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
                className="min-h-11 px-3 text-xs"
              >
                {isDeleting ? t("Wissen...") : t("Ja, wis workout")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfirmDelete(false);
                  setDeleteError(null);
                }}
                className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("Annuleren")}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="min-h-11 px-2 text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span>{t("Workout annuleren")}</span>
            </button>
          )}
        </div>
        <InlineAlert>{deleteError}</InlineAlert>
      </div>
    </div>
  );
}
