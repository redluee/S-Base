/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Trash2, Pencil, FileText, Upload, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { parseDateString } from "@/lib/utils";
import type { FullWorkoutSession, SessionSet } from "@backend/types/shared";
import { normalizeCategory, isTimedExercise } from "@/components/workout-exercise-card";
import { getOfflineSession, syncOfflineSession } from "@/lib/offline-workout";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatNumberNl } from "@/lib/number-input";
import { formatSessionDuration } from "@/lib/workout-time";
import { formatHistoryWeight } from "@/lib/set-display";

export function cleanSessionForExport(session: FullWorkoutSession) {
  const cleaned: Record<string, any> = {
    name: session.name || "Workout Session",
  };
  if (session.notes) cleaned.notes = session.notes;

  if (Array.isArray(session.exercises)) {
    cleaned.exercises = session.exercises.map((ex: any) => {
      const cleanedEx: Record<string, any> = {
        exerciseName: ex.exerciseName,
      };
      if (ex.category) cleanedEx.category = ex.category;
      if (ex.equipment) cleanedEx.equipment = ex.equipment;
      if (ex.perSide) cleanedEx.perSide = Number(ex.perSide);

      if (Array.isArray(ex.sets)) {
        cleanedEx.sets = ex.sets.map((s: any) => {
          const cleanedSet: Record<string, any> = {
            setNumber: s.setNumber,
          };
          if (s.reps != null) cleanedSet.reps = s.reps;
          if (s.weight != null && s.weight !== 0) cleanedSet.weight = s.weight;
          if (s.distance != null && s.distance > 0) cleanedSet.distance = s.distance;
          if (s.duration != null && s.duration > 0) cleanedSet.duration = s.duration;
          return cleanedSet;
        });
      }

      return cleanedEx;
    });
  }

  return cleaned;
}

export function WorkoutHistoryDetail({ session: initialSession }: { session: FullWorkoutSession }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const celebrate = searchParams?.get("celebrate") === "true";
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [session, setSession] = useState<FullWorkoutSession>(() => {
    if (initialSession?.sessionId) {
      const offlineData = getOfflineSession(initialSession.sessionId);
      if (offlineData?.session) return offlineData.session;
    }
    return initialSession;
  });

  useEffect(() => {
    if (initialSession?.sessionId) {
      const offlineData = getOfflineSession(initialSession.sessionId);
      if (offlineData?.pendingSync && navigator.onLine) {
        syncOfflineSession(initialSession.sessionId).then((synced) => {
          if (synced) setSession(synced);
        });
      }
    }
  }, [initialSession]);

  function handleExport() {
    const cleaned = cleanSessionForExport(session);
    const jsonString = JSON.stringify(cleaned, null, 2);
    setActionError(null);
    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setActionError(t("Kopiëren mislukt. Probeer het opnieuw.")));
  }

  useEffect(() => {
    if (celebrate) {
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Clean up search param without full reload
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state }, "", newUrl);

      return () => clearInterval(interval);
    }
  }, [celebrate]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.workouts.sessions.delete(session.sessionId);
      setShowDeleteConfirm(false);
      router.push("/workouts/history");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete workout", err);
      setShowDeleteConfirm(false);
      setActionError(t("Workout verwijderen mislukt. Probeer het opnieuw."));
    } finally {
      setDeleting(false);
    }
  }

  const started = parseDateString(session.startedAt);
  const completed = session.completedAt ? parseDateString(session.completedAt) : null;
  const durationSeconds = completed ? Math.max(0, Math.round((completed.getTime() - started.getTime()) / 1000)) : null;
  const sessionTitle = session.name?.trim() || t("Workout Session");

  return (
    <div>
      <Link
        href="/workouts/history"
        className="inline-flex items-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("History")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1 break-words">
            {sessionTitle}
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {started.toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center gap-x-3 gap-y-1 text-sm text-muted-foreground flex-wrap">
            {session.completedAt ? (
              <Badge className="bg-brand/20 text-brand">{t("Completed")}</Badge>
            ) : (
              <Badge className="bg-white/10 text-muted-foreground">{t("in progress")}</Badge>
            )}
            {session.exercises?.length !== undefined && (
              <span>
                {session.exercises.length} {session.exercises.length === 1 ? t("exercise") : t("exercises")}
              </span>
            )}
            {durationSeconds !== null && (
              <>
                <span aria-hidden="true">•</span>
                <span>{formatSessionDuration(durationSeconds)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleExport}
            title={t("Export JSON")}
            aria-label={t("Export JSON")}
            className="min-h-11 min-w-11 flex items-center gap-1.5"
          >
            {copied ? (
              <Check className="size-4 text-brand" />
            ) : (
              <Upload className="size-4" />
            )}
            <span className="hidden sm:inline">
              {copied ? t("Copied!") : t("Export")}
            </span>
          </Button>
          <Button
            render={<Link href={`/workouts/session/${session.sessionId}`} />}
            variant="outline"
            className="min-h-11 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
          >
            <Pencil className="size-4 mr-1.5" />
            {t("Edit")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={t("Delete")}
            title={t("Delete")}
            className="min-h-11 min-w-11 border-destructive text-destructive hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <InlineAlert className="mb-4">{actionError}</InlineAlert>

      {session.notes && (
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="size-3.5 text-brand" />
            <span>{t("Notes")}</span>
          </div>
          <p className="text-foreground leading-relaxed text-sm whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {session.exercises?.map((ex, i: number) => (
          <div
            key={ex.sessionExerciseId ?? i}
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <h2 className="font-medium text-foreground text-sm sm:text-base break-words min-w-0">
                {ex.exerciseName}
              </h2>
              {ex.equipment && ex.equipment !== "none" && (
                <div className="flex items-center gap-1 flex-wrap">
                  {ex.equipment
                    .split(",")
                    .map((item: string) => item.trim())
                    .filter((item: string) => item && item !== "none")
                    .map((item: string) => (
                      <span
                        key={item}
                        className="inline-flex items-center text-[10px] font-medium text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full"
                      >
                        {t(item)}
                      </span>
                    ))}
                </div>
              )}

            </div>
            {ex.sets?.length > 0 && (() => {
              const cat = normalizeCategory(ex.category);
              const timed = isTimedExercise(ex);
              const perSide = ex.perSide != null ? Boolean(ex.perSide) : Boolean(ex.templateExercise?.perSide);
              const assisted = Boolean(ex.isAssisted);
              const dash = "—";
              const formatSecs = (secVal: number | null | undefined) => {
                if (secVal === null || secVal === undefined || isNaN(secVal)) return dash;
                const min = Math.floor(secVal / 60);
                const sec = secVal % 60;
                return `${min}:${String(sec).padStart(2, "0")}`;
              };
              const num = (v: number | null | undefined) => (v === null || v === undefined ? dash : formatNumberNl(v));
              const repsOrTime = (set: SessionSet) =>
                timed || (set.duration != null && set.duration > 0 && (!set.reps || set.reps === 0))
                  ? formatSecs(set.duration)
                  : (set.reps ?? dash);
              const weightCell = (set: SessionSet) => formatHistoryWeight(set.weight, cat, assisted);
              const timeLabel = timed ? t("Time") : t("Reps");
              const perSideHint = perSide ? (
                <div className="text-[10px] text-muted-foreground leading-tight">({t("per side")})</div>
              ) : null;
              const th = "text-right py-2 px-1.5 sm:px-2 text-muted-foreground font-normal text-[11px] sm:text-xs leading-tight align-bottom";

              const weightLabel =
                cat === "bodyweight"
                  ? assisted ? t("Assisted (kg)") : t("Added Weight (kg)")
                  : cat === "isometric" ? t("Added weight (kg)") : "kg";

              return (
                <div className="-mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th scope="col" className="text-left py-2 pl-4 sm:pl-2 pr-1 text-muted-foreground font-normal text-[11px] sm:text-xs align-bottom">{t("Set")}</th>
                        {cat === "cardio" ? (
                          <>
                            <th scope="col" className={th}>{t("Distance (km)")}</th>
                            <th scope="col" className={th}>
                              <div>{t("Time")}</div>
                              {perSideHint}
                            </th>
                            <th scope="col" className={th}>{t("Avg HR (bpm)")}</th>
                          </>
                        ) : (
                          <>
                            <th scope="col" className={th}>{weightLabel}</th>
                            <th scope="col" className={th}>
                              <div>{timeLabel}</div>
                              {perSideHint}
                            </th>
                            {cat === "resistance" && <th scope="col" className={th}>{t("RPE (0-10)")}</th>}
                          </>
                        )}
                        <th scope="col" className={`${th} pr-4 sm:pr-2`}>{t("Complete")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set: SessionSet, si: number) => (
                        <tr key={si} className="border-b border-border/30 last:border-0 tabular-nums">
                          <td className="py-2 pl-4 sm:pl-2 pr-1 text-foreground font-medium">{set.setNumber}</td>
                          {cat === "cardio" ? (
                            <>
                              <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{num(set.distance)}</td>
                              <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{formatSecs(set.duration)}</td>
                              <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{set.heartRate ?? dash}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{weightCell(set)}</td>
                              <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{repsOrTime(set)}</td>
                              {cat === "resistance" && (
                                <td className="py-2 px-1.5 sm:px-2 text-right text-foreground">{set.rpe ?? dash}</td>
                              )}
                            </>
                          )}
                          <td className="py-2 pl-1.5 pr-4 sm:px-2 text-right">
                            {set.completed ? (
                              <span className="text-brand" role="img" aria-label={t("Voltooid")}>✓</span>
                            ) : (
                              <span className="text-muted-foreground" role="img" aria-label={t("Niet voltooid")}>–</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("Delete this workout?")}
        description={t("This workout and all its sets will be permanently removed from your history.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Delete")}
        tone="destructive"
        busy={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
