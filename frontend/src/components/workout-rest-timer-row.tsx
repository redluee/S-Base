"use client";

import { Timer, Volume2, VolumeX } from "lucide-react";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { formatTime } from "@/components/workout-exercise-card-utils";

const chipButton =
  "min-h-11 min-w-11 px-3 inline-flex items-center justify-center rounded-md bg-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

interface RestTimerRowProps {
  totalCols: number;
  swipeMode: boolean;
  restSecondsLeft: number;
  restTotalSeconds: number;
  restActive: boolean;
  adjustRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  soundEnabled?: boolean;
  toggleSound?: () => void;
}

export function RestTimerRow({
  totalCols,
  swipeMode,
  restSecondsLeft,
  restTotalSeconds,
  restActive,
  adjustRestTimer,
  stopRestTimer,
  soundEnabled,
  toggleSound,
}: RestTimerRowProps) {
  return (
          <tr className="border-b border-border/10 bg-zinc-950/50">
            <td colSpan={totalCols} className="p-0 relative overflow-hidden">
              <div
                className="absolute inset-0 bg-brand/10 transition-all duration-1000 ease-linear pointer-events-none"
                style={{ width: `${restTotalSeconds > 0 ? (restSecondsLeft / restTotalSeconds) * 100 : 0}%` }}
              />
              <div className={cn("relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 text-xs text-zinc-400 w-full", swipeMode && "pr-14")}>
                <Timer className={cn("size-4 shrink-0", restActive ? "text-brand animate-pulse" : "text-zinc-500")} aria-hidden="true" />
                <span
                  role="timer"
                  aria-label={t("Rusttijd")}
                  className="text-base font-bold text-brand tabular-nums min-w-12"
                >
                  {formatTime(restSecondsLeft)}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => adjustRestTimer(15)} className={chipButton}>
                    +15s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustRestTimer(-15)}
                    className={chipButton}
                    disabled={restSecondsLeft <= 15}
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    onClick={stopRestTimer}
                    className={cn(chipButton, "bg-red-950/55 border border-red-900/30 text-red-300 hover:bg-red-900/40")}
                  >
                    {t("Skip")}
                  </button>
                  {toggleSound && (
                    <button
                      type="button"
                      onClick={toggleSound}
                      title={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
                      aria-label={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
                      className={chipButton}
                    >
                      {soundEnabled ? (
                        <Volume2 className="size-4 text-brand" />
                      ) : (
                        <VolumeX className="size-4 text-zinc-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </td>
          </tr>

  );
}
