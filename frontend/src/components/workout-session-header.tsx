"use client";

import React from "react";
import type { MutableRefObject } from "react";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ArrowLeft, Trophy, Timer, Pause, Play, Save } from "lucide-react";
import { formatTime } from "@/components/workout-session-helpers";
import type { FullWorkoutSession } from "@backend/types/shared";

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
  unsynced: boolean;
  actionError: string | null;
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
  unsynced,
  actionError,
}: WorkoutSessionHeaderProps) {
  return (
  <div className="sticky top-0 bg-background z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-6 pt-6 pb-4 border-b border-border/40 mb-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
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
              aria-label={t("Opslaan")}
              className="bg-brand text-zinc-900 min-h-11 min-w-11"
            >
              <Check className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 max-w-full">
            <button
              type="button"
              onClick={handleBackClick}
              aria-label={t("Terug naar workouts")}
              className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl text-foreground min-w-0">
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                aria-label={`${t("Naam bewerken")}: ${sessionName}`}
                title={t("Naam bewerken")}
                className="min-h-11 max-w-full truncate text-left hover:text-brand transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
              >
                {sessionName}
              </button>
            </h1>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between sm:justify-end sm:shrink-0 min-w-0">
        <div className="flex items-center gap-2 bg-card border border-border pl-3 pr-1 rounded-lg">
          <Timer className="size-4 text-brand shrink-0" aria-hidden="true" />
          {session.completedAt ? (
            <div className="flex items-center gap-1 text-base font-semibold text-zinc-200 tabular-nums">
              {([
                { label: t("Uren"), value: Math.floor(elapsed / 3600), max: undefined as number | undefined, compose: (n: number) => n * 3600 + (elapsed % 3600) },
                { label: t("Minuten"), value: Math.floor((elapsed % 3600) / 60), max: 59, compose: (n: number) => Math.floor(elapsed / 3600) * 3600 + n * 60 + (elapsed % 60) },
                { label: t("Seconden"), value: elapsed % 60, max: 59, compose: (n: number) => Math.floor(elapsed / 60) * 60 + n },
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
              <span className="text-base tabular-nums font-semibold text-zinc-200">
                {formatTime(elapsed)}
              </span>
              <button
                type="button"
                onClick={togglePause}
                aria-label={isPaused ? t("Resume") : t("Pause")}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {isPaused ? <Play className="size-4 text-brand" /> : <Pause className="size-4" />}
              </button>
            </>
          )}
        </div>

        {session.completedAt ? (
          <Button
            onClick={handleSaveHistoryEdit}
            disabled={saving}
            className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-4 min-h-11"
          >
            <Save className="size-4 mr-1.5" />
            {t("Save")}
          </Button>
        ) : (
          <Button
            onClick={handleFinishClick}
            className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-4 min-h-11"
          >
            <Trophy className="size-4 mr-1.5" />
            {t("Finish")}
          </Button>
        )}
      </div>
    </div>
    {unsynced && (
      <p role="status" className="mt-2 text-xs text-muted-foreground">
        {t("Wijzigingen nog niet gesynchroniseerd. Ze zijn op dit apparaat bewaard.")}
      </p>
    )}
    {actionError && <InlineAlert className="mt-2">{actionError}</InlineAlert>}
  </div>
  );
}
