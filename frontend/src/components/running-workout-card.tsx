"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Trash2, Timer, Dumbbell } from "lucide-react";
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

  // Live timer tick
  useEffect(() => {
    const started = parseSessionDate(session.startedAt).getTime();
    
    const updateElapsed = () => {
      const diffMs = Math.max(0, Date.now() - started);
      setElapsed(Math.floor(diffMs / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await api.workouts.sessions.delete(session.sessionId);
      if (onDiscard) {
        onDiscard();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const startTimeFormatted = React.useMemo(() => {
    const date = parseSessionDate(session.startedAt);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  }, [session.startedAt]);

  if (compact) {
    return (
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-zinc-900/90 to-emerald-950/60 backdrop-blur-md border border-emerald-500/40 p-4 shadow-[0_0_2rem_-0.5rem_rgba(16,185,129,0.3)] hover:border-emerald-500/60 transition-all duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute inline-flex size-10 animate-ping rounded-full bg-emerald-500/20" />
              <div className="size-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Dumbbell className="size-4" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  {t("Lopende workout")}
                </span>
              </div>
              <h3 className="font-display font-black text-sm text-foreground truncate">
                {session.name || t("Workout Session")}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              <Timer className="size-3.5" />
              <span>{formatElapsedTime(elapsed)}</span>
            </div>
            <Link href={`/workouts/session/${session.sessionId}`}>
              <Button size="sm" className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs shadow-md shadow-emerald-500/20">
                <span>{t("Hervatten")}</span>
                <Play className="size-3 ml-1 fill-zinc-950" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/70 via-zinc-900/90 to-teal-950/60 border border-emerald-500/40 p-5 sm:p-6 shadow-[0_0_2.5rem_-0.5rem_rgba(16,185,129,0.35)] transition-all duration-300">
      {/* Animated Subtle Ambient Glow */}
      <div className="absolute -top-24 -right-24 size-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-4">
        {/* Header Badge & Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                {t("Workout in uitvoering")}
              </span>
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-foreground tracking-tight">
              {session.name || t("Workout Session")}
            </h2>
          </div>

          {/* Live Elapsed Counter Badge */}
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono font-black text-sm sm:text-base px-3 py-1.5 rounded-xl shadow-inner shrink-0">
            <Timer className="size-4 animate-pulse" />
            <span>{formatElapsedTime(elapsed)}</span>
          </div>
        </div>

        {/* Stats Summary Line */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {session.exerciseCount !== undefined && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-medium">
              🏋️‍♂️ {session.exerciseCount} {session.exerciseCount === 1 ? t("oefening") : t("oefeningen")}
            </span>
          )}
          {session.completedSetsCount !== undefined && session.totalSetsCount !== undefined && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-medium">
              ✅ {session.completedSetsCount} / {session.totalSetsCount} {t("sets voltooid")}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground font-medium">
            ⏱️ {t("Gestart om")} {startTimeFormatted}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 mt-1">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link href={`/workouts/session/${session.sessionId}`} className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-95">
                <Play className="size-4 mr-1.5 fill-zinc-950" />
                {t("Hervatten")}
              </Button>
            </Link>
            <Link href={`/workouts/session/${session.sessionId}`} className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full sm:w-auto border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 font-semibold text-sm">
                <CheckCircle2 className="size-4 mr-1.5 text-emerald-400" />
                {t("Workout afronden")}
              </Button>
            </Link>
          </div>

          {/* Delete / Discard Session */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end animate-in fade-in duration-150">
              <span className="text-zinc-400 font-medium">{t("Zeker weten?")}</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-2.5"
              >
                {isDeleting ? t("Wissen...") : t("Ja, wis workout")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfirmDelete(false)}
                className="text-zinc-400 hover:text-white text-xs h-8 px-2"
              >
                {t("Annuleren")}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1.5 transition-colors font-medium self-center py-1"
              title={t("Workout annuleren")}
            >
              <Trash2 className="size-3.5" />
              <span>{t("Workout annuleren")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
