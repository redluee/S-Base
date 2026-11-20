"use client";

import React from "react";
import type { MutableRefObject } from "react";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ArrowLeft, Trophy, Timer, Pause, Play, Save } from "lucide-react";
import type { FullWorkoutSession } from "@backend/types/shared";
import { formatClock } from "@/app/workouts/duration";
import { cn } from "@/lib/utils";

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

interface WorkoutSessionHeaderProps {
  session: FullWorkoutSession;
  sessionName: string;
  setSessionName: (name: string) => void;
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  nameCancelRef: MutableRefObject<boolean>;
  saveWorkoutTitle: () => void;
  handleBackClick: (e: React.MouseEvent) => void;
  elapsed: number;
  isPaused: boolean;
  togglePause: () => void;
  updateElapsedSeconds: (seconds: number) => void;
  saving: boolean;
  handleSaveHistoryEdit: () => void;
  handleFinishClick: () => void;
  allExercisesFinished: boolean;
  unsynced: boolean;
  actionError: string | null;
  setProgress: { done: number; total: number };
}

export function WorkoutSessionHeader({
  session,
  sessionName,
  setSessionName,
  isEditingName,
  setIsEditingName,
  nameCancelRef,
  saveWorkoutTitle,
  handleBackClick,
  elapsed,
  isPaused,
  togglePause,
  updateElapsedSeconds,
  saving,
  handleSaveHistoryEdit,
  handleFinishClick,
  allExercisesFinished,
  unsynced,
  actionError,
  setProgress,
}: WorkoutSessionHeaderProps) {
  const isCompleted = Boolean(session.completedAt);

  return (
  <div className="sticky top-0 bg-background/95 backdrop-blur z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-6 pt-6 pb-4 mb-6">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
      <div className={cn("min-w-0", isCompleted ? "basis-full sm:basis-0 sm:flex-1" : "flex-1")}>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={sessionName}
              aria-label={t("Workout title")}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={() => {
                if (nameCancelRef.current) {
                  nameCancelRef.current = false;
                  return;
                }
                saveWorkoutTitle();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveWorkoutTitle();
                if (e.key === "Escape") {
                  nameCancelRef.current = true;
                  setSessionName(session.name || t("Workout Session"));
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="bg-white/5 border-brand/40 text-xl font-semibold h-11"
            />
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={saveWorkoutTitle}
              aria-label={t("Save")}
              className="bg-brand text-zinc-900 min-h-11 min-w-11"
            >
              <Check className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={handleBackClick}
              aria-label={t("Back to workouts")}
              className="size-11 shrink-0 mr-1 inline-flex items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl text-foreground min-w-0">
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                aria-label={`${t("Edit name")}: ${sessionName}`}
                title={t("Edit name")}
                className="min-h-11 max-w-full truncate text-left hover:text-brand transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
              >
                {sessionName}
              </button>
            </h1>
          </div>
        )}
      </div>

      <div
        className={cn(
          "items-center gap-2 bg-card ring-1 ring-white/[0.06] pl-4 pr-1 rounded-full shrink-0",
          isEditingName && !isCompleted ? "hidden sm:flex" : "flex"
        )}
      >
        <Timer className="size-4 text-brand shrink-0" aria-hidden="true" />
        {session.completedAt ? (
          <div className="flex items-center gap-1 text-base font-semibold text-zinc-200 tabular-nums">
            {([
              { label: t("Uren"), value: Math.floor(elapsed / 3600), max: undefined as number | undefined, compose: (n: number) => n * 3600 + (elapsed % 3600) },
              { label: t("workout.Minutes"), value: Math.floor((elapsed % 3600) / 60), max: 59, compose: (n: number) => Math.floor(elapsed / 3600) * 3600 + n * 60 + (elapsed % 60) },
              { label: t("workout.Seconds"), value: elapsed % 60, max: 59, compose: (n: number) => Math.floor(elapsed / 60) * 60 + n },
            ]).map((part, i) => (
              <React.Fragment key={part.label}>
                {i > 0 && <span className="text-zinc-500" aria-hidden="true">:</span>}
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={part.label}
                  value={part.value}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                    const n = Math.max(0, parseInt(digits, 10) || 0);
                    const clamped = part.max !== undefined ? Math.min(part.max, n) : n;
                    updateElapsedSeconds(part.compose(clamped));
                  }}
                  className="w-11 min-h-11 bg-transparent border-b border-zinc-700 hover:border-zinc-500 focus:border-brand text-center focus:outline-none"
                />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <>
            <span className="text-lg tabular-nums font-medium text-foreground">
              {formatClock(elapsed)}
            </span>
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? t("Resume") : t("Pause")}
              className="size-11 inline-flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {isPaused ? <Play className="size-4 text-brand" /> : <Pause className="size-4" />}
            </button>
          </>
        )}
      </div>

      {isCompleted ? (
        <Button
          onClick={handleSaveHistoryEdit}
          disabled={saving}
          className="ml-auto shrink-0 rounded-full bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-5 min-h-11"
        >
          <Save className="size-4 mr-1.5" />
          {t("Save")}
        </Button>
      ) : allExercisesFinished ? (
        <div className="flex basis-full justify-end sm:basis-auto sm:shrink-0">
          <Button
            onClick={handleFinishClick}
            className="animate-scale-in rounded-full bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-5 min-h-11 shadow-[0_0_2rem_color-mix(in_oklab,var(--color-brand)_35%,transparent)]"
          >
            <Trophy className="size-4 mr-1.5" />
            {t("Finish")}
          </Button>
        </div>
      ) : null}
    </div>
    {!isCompleted && setProgress.total > 0 && (
      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={t("Sets completed")}
          aria-valuemin={0}
          aria-valuemax={setProgress.total}
          aria-valuenow={setProgress.done}
          className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-brand shadow-[0_0_0.75rem_var(--color-brand)] transition-[width] duration-500 ease-out"
            style={{ width: `${(setProgress.done / setProgress.total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {setProgress.done}/{setProgress.total} {t("sets")}
        </span>
      </div>
    )}
    {unsynced && (
      <p role="status" className="mt-2 text-xs text-muted-foreground">
        {t("Changes not yet synced. Saved on this device.")}
      </p>
    )}
    {actionError && <InlineAlert className="mt-2">{actionError}</InlineAlert>}
  </div>
  );
}
