/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
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
import { ExerciseEditBlock } from "@/components/exercise-edit-block";
import { TemplateDraftNotice } from "@/components/workout-template-draft-notice";
import { TemplateInfoFields } from "@/components/workout-template-info-fields";
import {
  buildInitialExercises,
  buildTemplatePayload,
  createBlankExercise,
  scrollToExercise,
  validateTemplate,
  type ExerciseRow,
} from "@/components/workout-template-form-helpers";
import { Plus, Loader2 } from "lucide-react";

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
  
  const [exercises, setExercises] = useState<ExerciseRow[]>(() => buildInitialExercises(initial));

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
    setExercises((prev) => [...prev, createBlankExercise(id)]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function moveExercise(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target > exercises.length - 1) return;
    const movedId = exercises[index]?.id;
    setExercises((prev) => {
      if (target < 0 || target > prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
    if (movedId) scrollToExercise(movedId);
  }

  function moveExerciseUp(index: number) {
    moveExercise(index, -1);
  }

  function moveExerciseDown(index: number) {
    moveExercise(index, 1);
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

    const newErrors = validateTemplate(name, exercises);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    const data = buildTemplatePayload({ name, description, targetMuscleGroups, estimatedTime }, exercises);

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
        <TemplateDraftNotice kind={draftNotice.kind} onLoadStale={loadStaleDraft} onDiscard={discardDraft} />
      )}
      <TemplateInfoFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        targetMuscleGroups={targetMuscleGroups}
        setTargetMuscleGroups={setTargetMuscleGroups}
        estimatedTime={estimatedTime}
        setEstimatedTime={setEstimatedTime}
        errors={errors}
      />

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
