/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { buildTemplateMeta } from "@/lib/template-payload";
import { useState, useEffect, useRef } from "react";
import { parseDecimal, toInputString } from "@/lib/number-input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import {
  formSignature,
  shouldPersistDraft,
  buildDraft,
  parseDraft,
  evaluateDraft,
  type TemplateDraft,
  type TemplateDraftForm,
} from "@/lib/template-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExerciseEditBlock } from "@/components/exercise-edit-block";
import { Plus, Loader2 } from "lucide-react";

function mapCategory(cat: string) {
  if (cat === "resistance") return "Free Weights";
  if (cat === "bodyweight") return "Bodyweight";
  if (cat === "cardio") return "Cardio";
  if (cat === "isometric") return "Functional";
  return cat || "Free Weights";
}

function mapEquipment(eq: string) {
  if (eq === "none") return "Bodyweight";
  if (eq === "barbell") return "Barbell";
  if (eq === "dumbbell") return "Dumbbell";
  if (eq === "kettlebell") return "Kettlebell";
  if (eq === "cable") return "Cable";
  if (eq === "machine") return "Machine";
  if (eq === "band") return "Resistance Band";
  if (eq === "ball" || eq === "bal") return "Medicine Ball";
  return eq || "Dumbbell";
}

interface TrackingFields {
  reps: boolean;
  time: boolean;
  weight: boolean;
  distance: boolean;
}

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  distanceUnit: string;
  duration: string;
  heartRate: string;
  rpe: string;
  defaultRestTime: string;
  equipment: string;
  perSide: boolean;
  isAssisted: boolean;
  trackingFields: TrackingFields;
}

function parseDuration(val: string): number | undefined {
  if (!val || !val.trim()) return undefined;
  if (val.includes(":")) {
    const parts = val.split(":");
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function formatDuration(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function getDefaultTracking(category: string): TrackingFields {
  if (category === "Cardio") return { reps: false, time: true, weight: false, distance: true };
  if (category === "Functional") return { reps: true, time: false, weight: true, distance: false };
  return { reps: true, time: false, weight: true, distance: false };
}

function getInitialTracking(e: any, category: string): TrackingFields {
  const defaults = getDefaultTracking(category);
  if (!e) return defaults;
  
  return {
    reps: (e.defaultReps !== null && e.defaultReps > 0) ? true : (e.defaultReps === 0 ? false : defaults.reps),
    time: (e.defaultDuration !== null && e.defaultDuration > 0) ? true : defaults.time,
    weight: (e.defaultWeight !== null && e.defaultWeight !== undefined) ? true : defaults.weight,
    distance: (e.defaultDistance !== null && e.defaultDistance > 0) ? true : defaults.distance,
  };
}

export function WorkoutTemplateForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const isEdit = !!initial;

  const storageKey = isEdit
    ? `workout_template_draft_edit_${initial?.templateId}`
    : "workout_template_draft_new";

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetMuscleGroups, setTargetMuscleGroups] = useState(initial?.targetMuscleGroups ?? "");
  const [estimatedTime, setEstimatedTime] = useState(initial?.estimatedTime?.toString() ?? "");
  
  const [exercises, setExercises] = useState<ExerciseRow[]>(() => 
    initial?.exercises?.map((e: any, i: number) => {
      const cat = mapCategory(e.category);
      return {
        id: `ex-${i}`,
        name: e.exerciseName,
        category: cat,
        sets: e.defaultSets?.toString() || "3",
        reps: e.defaultReps?.toString() ?? "8",
        weight: e.defaultWeight != null ? toInputString(Math.abs(e.defaultWeight)) : "",
        distance: toInputString(e.defaultDistance),
        distanceUnit: "km",
        duration: formatDuration(e.defaultDuration),
        heartRate: e.defaultHeartRate?.toString() ?? "",
        rpe: e.defaultRpe?.toString() ?? "",
        defaultRestTime: formatDuration(e.defaultRestTime ?? 90),
        equipment: mapEquipment(e.equipment),
        perSide: Boolean(e.perSide),
        isAssisted: Boolean(e.isAssisted),
        trackingFields: getInitialTracking(e, cat)
      };
    }) ?? [{ 
      id: "ex-0", 
      name: "", 
      category: "Free Weights", 
      sets: "3", 
      reps: "8", 
      weight: "", 
      distance: "", 
      distanceUnit: "km",
      duration: "", 
      heartRate: "", 
      rpe: "",
      defaultRestTime: "01:30",
      equipment: "",
      perSide: false,
      isAssisted: false,
      trackingFields: { reps: true, time: false, weight: true, distance: false }
    }]
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const [initialForm] = useState<TemplateDraftForm<ExerciseRow>>(() => ({
    name,
    description,
    targetMuscleGroups,
    estimatedTime,
    exercises,
  }));
  const [baseSignature] = useState(() => formSignature(initialForm));
  const [draftNotice, setDraftNotice] = useState<{ kind: "restored" | "stale"; draft: TemplateDraft<ExerciseRow> } | null>(null);

  function applyForm(form: TemplateDraftForm<ExerciseRow>) {
    setName(form.name);
    setDescription(form.description);
    setTargetMuscleGroups(form.targetMuscleGroups);
    setEstimatedTime(form.estimatedTime);
    setExercises(form.exercises.length > 0 ? form.exercises : initialForm.exercises);
  }

  function removeStoredDraft() {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Failed to remove template draft from localStorage", e);
    }
  }

  // Restore a saved draft only when it still matches the server version it was based on
  useEffect(() => {
    let notice: { kind: "restored" | "stale"; draft: TemplateDraft<ExerciseRow> } | null = null;
    try {
      const draft = parseDraft<ExerciseRow>(localStorage.getItem(storageKey));
      if (draft) {
        const status = evaluateDraft(draft, baseSignature);
        if (status === "unchanged") {
          removeStoredDraft();
        } else {
          notice = { kind: status === "fresh" ? "restored" : "stale", draft };
        }
      }
    } catch (e) {
      console.error("Failed to load template draft from localStorage", e);
    }
    queueMicrotask(() => {
      if (notice?.kind === "restored") applyForm(notice.draft.form);
      setDraftNotice(notice);
      setIsMounted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist only real edits; remove the draft when the form equals the server version again
  useEffect(() => {
    if (!isMounted || draftNotice?.kind === "stale") return;
    try {
      const form = { name, description, targetMuscleGroups, estimatedTime, exercises };
      if (shouldPersistDraft(form, baseSignature)) {
        localStorage.setItem(storageKey, JSON.stringify(buildDraft(form, baseSignature)));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error("Failed to save template draft to localStorage", e);
    }
  }, [name, description, targetMuscleGroups, estimatedTime, exercises, isMounted, storageKey, draftNotice, baseSignature]);

  function discardDraft() {
    removeStoredDraft();
    if (draftNotice?.kind === "restored") applyForm(initialForm);
    setDraftNotice(null);
  }

  function loadStaleDraft() {
    if (draftNotice?.kind !== "stale") return;
    applyForm(draftNotice.draft.form);
    setDraftNotice({ kind: "restored", draft: draftNotice.draft });
  }

  function addExercise() {
    const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setExercises((prev) => [
      ...prev, 
      { 
        id, 
        name: "", 
        category: "Free Weights", 
        sets: "3", 
        reps: "8", 
        weight: "", 
        distance: "", 
        distanceUnit: "km",
        duration: "", 
        heartRate: "", 
        rpe: "",
        defaultRestTime: "01:30",
        equipment: "",
        perSide: false,
        isAssisted: false,
        trackingFields: { reps: true, time: false, weight: true, distance: false }
      }
    ]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function moveExerciseUp(index: number) {
    if (index <= 0) return;
    const movedId = exercises[index]?.id;
    setExercises((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    if (movedId) {
      setTimeout(() => {
        const el =
          document.getElementById(`template-exercise-${movedId}`) ||
          document.querySelector(`[data-exercise-id="${movedId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const isVeryTall = rect.height > window.innerHeight * 0.75;
          el.scrollIntoView({
            behavior: "smooth",
            block: isVeryTall ? "start" : "center",
          });
        }
      }, 60);
    }
  }

  function moveExerciseDown(index: number) {
    if (index >= exercises.length - 1) return;
    const movedId = exercises[index]?.id;
    setExercises((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    if (movedId) {
      setTimeout(() => {
        const el =
          document.getElementById(`template-exercise-${movedId}`) ||
          document.querySelector(`[data-exercise-id="${movedId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const isVeryTall = rect.height > window.innerHeight * 0.75;
          el.scrollIntoView({
            behavior: "smooth",
            block: isVeryTall ? "start" : "center",
          });
        }
      }, 60);
    }
  }



  function updateExerciseMultiple(id: string, fields: Partial<Omit<ExerciseRow, "id">>) {
    setExercises((prev) => prev.map((ex) => {
      if (ex.id !== id) return ex;
      return { ...ex, ...fields };
    }));
  }

  useEffect(() => {
    if (error || Object.keys(errors).length > 0) {
      feedbackRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [error, errors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t("Template name is required.");
    }

    exercises.forEach((ex) => {
      if (ex.name.trim()) {
        if (!ex.sets.trim() || isNaN(Number(ex.sets)) || Number(ex.sets) < 1) {
          newErrors[`${ex.id}-sets`] = t("Sets must be at least 1.");
        }
        if (ex.trackingFields.reps) {
          if (!ex.reps.trim() || isNaN(Number(ex.reps)) || Number(ex.reps) < 0) {
            newErrors[`${ex.id}-reps`] = t("Reps must be a valid number.");
          }
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    const data = {
      ...buildTemplateMeta({ name, description, targetMuscleGroups, estimatedTime }),
      exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => {
          const parsedWeight = parseDecimal(ex.weight);
          const parsedRpe = parseDecimal(ex.rpe);
          const parsedHeartRate = parseDecimal(ex.heartRate);
          let dist = parseDecimal(ex.distance) ?? undefined;
          if (dist !== undefined && ex.distanceUnit === "m") {
            dist = dist / 1000;
          }

          return {
            exerciseName: ex.name.trim(),
            category: ex.category,
            sets: Number(ex.sets),
            reps: ex.trackingFields.reps ? Number(ex.reps) : 0,
            weight: (ex.trackingFields.weight && parsedWeight !== null)
              ? (ex.isAssisted ? -Math.abs(parsedWeight) : Math.abs(parsedWeight))
              : null,
            distance: (ex.trackingFields.distance && dist) ? dist : null,
            duration: ex.trackingFields.time ? (parseDuration(ex.duration) ?? null) : null,
            heartRate: parsedHeartRate !== null ? parsedHeartRate : undefined,
            rpe: parsedRpe !== null ? parsedRpe : undefined,
            defaultRestTime: parseDuration(ex.defaultRestTime) ?? 90,
            equipment: ex.equipment || "none",
            perSide: ex.perSide ? 1 : 0,
            isAssisted: ex.isAssisted ? 1 : 0,
          };
        }),
    };

    try {
      let result;
      if (isEdit) {
        result = await api.workouts.templates.update(initial.templateId, data);
      } else {
        result = await api.workouts.templates.create(data);
      }
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error("Failed to remove template draft from localStorage", e);
      }
      router.push(`/workouts/t/${result.templateId}`);
      router.refresh();
    } catch (err) {
      setError(t("Failed to save template. Please try again."));
      console.error("Failed to save template", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 sm:gap-8">
      {draftNotice && (
        <div role="status" className="rounded-lg bg-card border border-border px-4 py-3 text-sm flex flex-col gap-3 min-w-0">
          <p className="text-foreground break-words">
            {draftNotice.kind === "restored"
              ? t("Unsaved draft restored from this device.")
              : t("An older unsaved draft exists, but this template has changed since.")}
          </p>
          <div className="flex flex-wrap gap-2">
            {draftNotice.kind === "stale" && (
              <Button type="button" variant="outline" onClick={loadStaleDraft} className="min-h-11 min-w-11">
                {t("Load draft anyway")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={discardDraft} className="min-h-11 min-w-11">
              {t("Discard draft")}
            </Button>
          </div>
        </div>
      )}
      {/* Header Info */}
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm font-medium">{t("Template Name")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g., Push Day (Hypertrophy)")}
            aria-invalid={Boolean(errors.name)}
            className={`bg-white/5 border-border h-11 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            required
            autoFocus
          />
          {errors.name && <p role="alert" className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-sm font-medium">{t("Description")} <span className="text-muted-foreground font-normal">({t("Optional")})</span></Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Focus on slow eccentrics...")}
            rows={2}
            className="bg-white/5 border-border resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="targetMuscleGroups" className="text-sm font-medium">{t("Target Muscles")}</Label>
            <Input
              id="targetMuscleGroups"
              value={targetMuscleGroups}
              onChange={(e) => setTargetMuscleGroups(e.target.value)}
              placeholder={t("Chest, Triceps, Shoulders")}
              className="bg-white/5 border-border h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estimatedTime" className="text-sm font-medium">{t("Est. Duration (min)")}</Label>
            <Input
              id="estimatedTime"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value.replace(/\D/g, ""))}
              placeholder="60"
              className="bg-white/5 border-border h-11"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50 w-full" />

      {/* Exercises Array */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("Exercises")}</h2>
        </div>

        <div className="flex flex-col gap-6">
          {exercises.map((ex, index) => (
            <ExerciseEditBlock
              key={ex.id}
              exercise={ex}
              index={index}
              errors={errors}
              onChange={(fields) => updateExerciseMultiple(ex.id, fields)}
              onRemove={exercises.length > 1 ? () => removeExercise(ex.id) : undefined}
              onMoveUp={() => moveExerciseUp(index)}
              onMoveDown={() => moveExerciseDown(index)}
              canMoveUp={index > 0}
              canMoveDown={index < exercises.length - 1}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addExercise}
          className="w-full py-6 border-dashed border-2 hover:bg-white/5"
        >
          <Plus className="size-5 mr-2 text-muted-foreground" />
          <span className="font-semibold text-muted-foreground">{t("Add Exercise")}</span>
        </Button>
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 mt-6 z-10 flex flex-col gap-2">
        <div ref={feedbackRef} className="flex flex-col gap-2 scroll-mb-24">
          <InlineAlert className="bg-card">{error}</InlineAlert>
          {Object.keys(errors).length > 0 && (
            <InlineAlert className="bg-card">{t("Controleer de gemarkeerde velden.")}</InlineAlert>
          )}
        </div>
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full min-h-12 font-bold bg-brand text-zinc-950 hover:bg-brand-hover"
        >
          {loading && <Loader2 className="mr-2 size-5 animate-spin" />}
          {isEdit ? t("Save Changes") : t("Create Template")}
        </Button>
      </div>
    </form>
  );
}
