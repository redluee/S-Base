/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Play, Upload, Check } from "lucide-react";
import { normalizeCategory } from "@/components/workout-exercise-card";
import { SessionConflictDialog } from "@/components/session-conflict-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { formatNumberNl } from "@/lib/number-input";
import { parseSessionConflict, type ActiveSessionInfo } from "@/lib/session-conflict";

export function cleanTemplateForExport(template: any) {
  const cleaned: Record<string, any> = {
    name: template.name,
  };
  if (template.description) cleaned.description = template.description;
  if (template.targetMuscleGroups) cleaned.targetMuscleGroups = template.targetMuscleGroups;
  if (template.estimatedTime) cleaned.estimatedTime = template.estimatedTime;

  if (Array.isArray(template.exercises)) {
    cleaned.exercises = template.exercises.map((ex: any) => {
      const cleanedEx: Record<string, any> = {
        exerciseName: ex.exerciseName,
      };
      if (ex.category) cleanedEx.category = ex.category;

      const sets = ex.defaultSets ?? ex.sets;
      if (sets != null) cleanedEx.sets = sets;

      const reps = ex.defaultReps ?? ex.reps;
      if (reps != null) cleanedEx.reps = reps;

      const weight = ex.defaultWeight ?? ex.weight;
      if (weight != null && weight !== 0) cleanedEx.weight = weight;

      const distance = ex.defaultDistance ?? ex.distance;
      if (distance != null && distance > 0) cleanedEx.distance = distance;

      const duration = ex.defaultDuration ?? ex.duration;
      if (duration != null && duration > 0) cleanedEx.duration = duration;

      const restTime = ex.defaultRestTime ?? ex.restTime;
      if (restTime != null && restTime > 0) cleanedEx.defaultRestTime = restTime;

      if (ex.equipment) cleanedEx.equipment = ex.equipment;
      if (ex.perSide) cleanedEx.perSide = Number(ex.perSide);
      if (ex.isAssisted) cleanedEx.isAssisted = Number(ex.isAssisted);

      const rpe = ex.defaultRpe ?? ex.rpe;
      if (rpe != null) cleanedEx.rpe = rpe;

      const heartRate = ex.defaultHeartRate ?? ex.heartRate;
      if (heartRate != null) cleanedEx.heartRate = heartRate;

      return cleanedEx;
    });
  } else {
    cleaned.exercises = [];
  }

  return cleaned;
}

export function WorkoutTemplateDetail({ template }: { template: any }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ActiveSessionInfo | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startingRef = useRef(false);

  function handleExport() {
    const cleaned = cleanTemplateForExport(template);
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

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.workouts.templates.delete(template.templateId);
      setShowDeleteConfirm(false);
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete template", err);
      setShowDeleteConfirm(false);
      setActionError(t("Sjabloon verwijderen mislukt. Probeer het opnieuw."));
    } finally {
      setDeleting(false);
    }
  }

  async function handleStart(force = false) {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setStartError(null);
    try {
      const session = await api.workouts.sessions.create(template.templateId, force);
      router.push(`/workouts/session/${session.sessionId}`);
      router.refresh();
    } catch (err) {
      const active = parseSessionConflict(err);
      if (active) {
        setConflict(active);
      } else {
        console.error("Failed to start workout", err);
        setStartError(t("Failed to start workout. Please try again."));
      }
      startingRef.current = false;
      setStarting(false);
    }
  }

  function handleResume() {
    if (!conflict) return;
    router.push(`/workouts/session/${conflict.sessionId}`);
  }

  async function handleStartNew() {
    setConflict(null);
    await handleStart();
  }

  return (
    <div>
      <Link
        href="/workouts"
        className="inline-flex items-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("Workouts")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-2 break-words">
            {template.name}
          </h1>
          {template.description && (
            <p className="text-sm text-muted-foreground mb-3 break-words">{template.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {template.exercises?.length !== undefined && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                {template.exercises.length} {template.exercises.length === 1 ? t("exercise") : t("exercises")}
              </span>
            )}
            {template.targetMuscleGroups && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 break-words min-w-0">
                {template.targetMuscleGroups}
              </span>
            )}
            {template.estimatedTime && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                {template.estimatedTime} {t("min")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 items-center">
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
            render={<Link href={`/workouts/t/${template.templateId}/edit`} />}
            variant="outline"
            className="min-h-11"
          >
            {t("Edit")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="min-h-11 border-destructive text-destructive hover:bg-destructive/10"
          >
            {t("Delete")}
          </Button>
        </div>
      </div>

      <InlineAlert className="mb-4">{actionError}</InlineAlert>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("Delete this template?")}
        description={t("The template is removed. Workouts you already logged with it stay in your history.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Delete")}
        tone="destructive"
        busy={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />

      {conflict && (
        <SessionConflictDialog
          key={conflict.sessionId}
          session={conflict}
          busy={starting}
          onResume={handleResume}
          onStartNew={handleStartNew}
          onCancel={() => setConflict(null)}
        />
      )}

      <InlineAlert className="mb-3">{startError}</InlineAlert>

      <Button
        onClick={() => handleStart()}
        disabled={starting}
        className="w-full mb-8 bg-brand text-zinc-900 hover:bg-brand-hover text-base sm:text-lg min-h-14 font-semibold"
      >
        <Play className="size-5 mr-2" />
        {t("Start workout")}
      </Button>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("Exercises")}</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
            {template.exercises?.length || 0} {template.exercises?.length === 1 ? t("exercise") : t("exercises")}
          </span>
        </div>
        {template.exercises?.length > 0 ? (
          <div className="flex flex-col gap-3">
            {template.exercises.map((ex: any, i: number) => {
              const formatSecs = (secVal: number | null | undefined) => {
                if (secVal === null || secVal === undefined) return "";
                const min = Math.floor(secVal / 60);
                const sec = secVal % 60;
                return `${min}:${String(sec).padStart(2, "0")}`;
              };

              const categoryLabels: Record<string, string> = {
                resistance: t("Free Weights"),
                bodyweight: t("Bodyweight"),
                cardio: t("Cardio"),
                isometric: t("Functional"),
              };

              const cat = normalizeCategory(ex.category);
              const categoryLabel = categoryLabels[cat] || ex.category || cat;

              const equipmentList = ex.equipment
                ? ex.equipment
                    .split(",")
                    .map((item: string) => item.trim())
                    .filter(Boolean)
                : [];

              return (
                <div
                  key={ex.templateExerciseId ?? i}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-base sm:text-lg break-words">
                          {ex.exerciseName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-brand/20 text-brand border border-brand/40">
                          {categoryLabel}
                        </span>
                        {equipmentList.map((eqItem: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700"
                          >
                            {t(eqItem) || eqItem}
                          </span>
                        ))}
                        {Boolean(ex.isAssisted) && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                            {t("Assisted")}
                          </span>
                        )}
                        {Boolean(ex.perSide) && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                            {t("Per side")}
                          </span>
                        )}
                      </div>
                    </div>

                    {ex.defaultRestTime != null && (
                      <span className="text-xs font-medium text-zinc-200 bg-zinc-800/90 px-2.5 py-1 rounded-md border border-zinc-700 shrink-0">
                        {t("Rest")}: {formatSecs(ex.defaultRestTime)}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 text-xs sm:text-sm text-zinc-300 flex flex-wrap gap-y-1 gap-x-3 items-center">
                    <span className="font-semibold text-foreground">
                      {ex.defaultSets} {ex.defaultSets === 1 ? t("Set") : t("Sets")}
                    </span>

                    {ex.defaultReps != null && ex.defaultReps > 0 && (
                      <span>• {ex.defaultReps} {t("Reps")}</span>
                    )}

                    {ex.defaultDuration != null && ex.defaultDuration > 0 && (
                      <span>• {formatSecs(ex.defaultDuration)}</span>
                    )}

                    {ex.defaultWeight != null && (cat === "bodyweight" || cat === "isometric" ? ex.defaultWeight !== 0 : true) && (
                      <span>
                        • {ex.defaultWeight > 0 && (cat === "bodyweight" || cat === "isometric") ? `+${formatNumberNl(ex.defaultWeight)}` : formatNumberNl(cat === "bodyweight" && ex.isAssisted ? Math.abs(ex.defaultWeight) : ex.defaultWeight)} kg
                      </span>
                    )}

                    {ex.defaultDistance != null && ex.defaultDistance > 0 && (
                      <span>• {formatNumberNl(ex.defaultDistance)} km</span>
                    )}

                    {ex.defaultHeartRate != null && ex.defaultHeartRate > 0 && (
                      <span>• {ex.defaultHeartRate} bpm</span>
                    )}

                    {ex.defaultRpe != null && ex.defaultRpe > 0 && (
                      <span>• RPE {ex.defaultRpe}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No exercises yet.")}</p>
        )}
      </section>
    </div>
  );
}
