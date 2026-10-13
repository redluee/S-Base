"use client";

import type { RefObject } from "react";
import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { t } from "@/lib/lang";
import type { SystemUpdateState, UpdatePhase } from "@/lib/api";
import { FOCUS } from "./system-panel-styles";

export const UPDATE_STEPS: { phase: UpdatePhase; label: string }[] = [
  { phase: "repositories", label: "Repositories laden" },
  { phase: "resolving", label: "Afhankelijkheden oplossen" },
  { phase: "downloading", label: "Downloaden" },
  { phase: "installing", label: "Installeren" },
  { phase: "cleanup", label: "Opruimen" },
  { phase: "verifying", label: "Verifiëren" },
  { phase: "complete", label: "Klaar" },
];

export function UpdateProgress({
  update,
  updateRunning,
  currentStep,
  progress,
  progressPct,
  succeeded,
  failed,
  phase,
  showLog,
  setShowLog,
  logRef,
  logLines,
}: {
  update: SystemUpdateState | null;
  updateRunning: boolean;
  currentStep: number;
  progress: { current: number; total: number } | null;
  progressPct: number;
  succeeded: boolean;
  failed: boolean;
  phase: UpdatePhase | null;
  showLog: boolean;
  setShowLog: (updater: (v: boolean) => boolean) => void;
  logRef: RefObject<HTMLPreElement | null>;
  logLines: string[];
}) {
  return (
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
  );
}
