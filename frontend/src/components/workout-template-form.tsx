/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { Plus, X, Loader2 } from "lucide-react";

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  duration: string;
  rpe: string;
  heartRate: string;
  defaultRestTime: string;
  equipment: string;
}

function parseDuration(val: string): number | undefined {
  if (!val.trim()) return undefined;
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
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function WorkoutTemplateForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetMuscleGroups, setTargetMuscleGroups] = useState(initial?.targetMuscleGroups ?? "");
  const [estimatedTime, setEstimatedTime] = useState(initial?.estimatedTime?.toString() ?? "");
  const [exercises, setExercises] = useState<ExerciseRow[]>(
    initial?.exercises?.map((e: any, i: number) => ({
      id: `ex-${i}`,
      name: e.exerciseName,
      category: e.category ?? "resistance",
      sets: e.defaultSets.toString(),
      reps: e.defaultReps?.toString() ?? "10",
      weight: e.defaultWeight?.toString() ?? "",
      distance: e.defaultDistance?.toString() ?? "",
      duration: formatDuration(e.defaultDuration),
      rpe: e.defaultRpe?.toString() ?? "",
      heartRate: e.defaultHeartRate?.toString() ?? "",
      defaultRestTime: e.defaultRestTime?.toString() ?? "90",
      equipment: e.equipment ?? "none",
    })) ?? [{ id: "ex-0", name: "", category: "resistance", sets: "3", reps: "10", weight: "", distance: "", duration: "", rpe: "", heartRate: "", defaultRestTime: "90", equipment: "none" }],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addExercise() {
    const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setExercises((prev) => [...prev, { id, name: "", category: "resistance", sets: "3", reps: "10", weight: "", distance: "", duration: "", rpe: "", heartRate: "", defaultRestTime: "90", equipment: "none" }]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function updateExercise(id: string, field: keyof Omit<ExerciseRow, "id">, value: string) {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
  }

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
        if (ex.category === "resistance" || ex.category === "bodyweight") {
          if (!ex.reps.trim() || isNaN(Number(ex.reps)) || Number(ex.reps) < 1) {
            newErrors[`${ex.id}-reps`] = t("Reps must be at least 1.");
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
      name,
      description: description || undefined,
      targetMuscleGroups: targetMuscleGroups || undefined,
      estimatedTime: estimatedTime ? Number(estimatedTime) : undefined,
      exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          exerciseName: ex.name.trim(),
          category: ex.category,
          sets: Number(ex.sets),
          reps: (ex.category === "resistance" || ex.category === "bodyweight") ? Number(ex.reps) : 0,
          weight: (ex.category === "resistance" || ex.category === "bodyweight" || ex.category === "isometric") && ex.weight ? Number(ex.weight) : undefined,
          distance: ex.category === "cardio" && ex.distance ? Number(ex.distance) : undefined,
          duration: (ex.category === "cardio" || ex.category === "isometric") ? parseDuration(ex.duration) : undefined,
          rpe: ex.category === "resistance" && ex.rpe ? Number(ex.rpe) : undefined,
          heartRate: ex.category === "cardio" && ex.heartRate ? Number(ex.heartRate) : undefined,
          defaultRestTime: ex.defaultRestTime ? Number(ex.defaultRestTime) : 90,
          equipment: ex.equipment || "none",
        })),
    };

    try {
      let result;
      if (isEdit) {
        result = await api.workouts.templates.update(initial.templateId, data);
      } else {
        result = await api.workouts.templates.create(data);
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
      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Basic Info")}</h2>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
              }}
              required
              placeholder={t("e.g. Full Body")}
              className={`bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 ${
                errors.name ? "border-red-500/50" : "border-border"
              }`}
            />
            {errors.name && <span className="text-xs text-red-400 mt-0.5">{errors.name}</span>}
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="description">{t("Description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("A brief description...")}
              className="bg-white/5 border-border min-h-[60px] transition-all duration-150 focus-visible:border-brand/50"
            />
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="targetMuscleGroups">{t("Target muscle groups")}</Label>
            <Input
              id="targetMuscleGroups"
              value={targetMuscleGroups}
              onChange={(e) => setTargetMuscleGroups(e.target.value)}
              placeholder={t("e.g. Chest, shoulders, triceps")}
              className="bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 border-border"
            />
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="estimatedTime">{t("Estimated time (minutes)")}</Label>
            <Input
              id="estimatedTime"
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="45"
              className="bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 border-border"
            />
          </div>
        </div>
      </div>

      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Exercises")}</h2>

        <div className="flex flex-col gap-2">
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('No exercises yet. Click "Add" to get started.')}
            </p>
          )}
          {exercises.map((ex, i) => (
            <div
              key={ex.id}
              className="rounded-lg border border-border/50 bg-white/[0.02] p-2.5 sm:p-3 transition-colors hover:border-border/80"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <ExerciseAutocomplete
                    value={ex.name}
                    onChange={(v) => updateExercise(ex.id, "name", v)}
                    onSelect={(v, defaultSets, defaultReps, category) => {
                      updateExercise(ex.id, "name", v);
                      if (defaultSets) updateExercise(ex.id, "sets", String(defaultSets));
                      if (defaultReps) updateExercise(ex.id, "reps", String(defaultReps));
                      if (category) updateExercise(ex.id, "category", category);
                    }}
                    placeholder={t("Exercise") + ` ${i + 1}`}
                    className="h-9 sm:h-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExercise(ex.id)}
                  className="shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 h-9 w-9 sm:h-8 sm:w-8"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("Category")}</Label>
                  <select
                    value={ex.category}
                    onChange={(e) => updateExercise(ex.id, "category", e.target.value)}
                    className="bg-white/5 border border-border/80 rounded-md h-8 px-2 text-xs text-foreground focus:outline-none focus:border-brand/40 cursor-pointer"
                  >
                    <option value="resistance" className="bg-zinc-900">{t("Resistance")}</option>
                    <option value="bodyweight" className="bg-zinc-900">{t("Bodyweight")}</option>
                    <option value="cardio" className="bg-zinc-900">{t("Cardio")}</option>
                    <option value="isometric" className="bg-zinc-900">{t("Isometric")}</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("Sets")}</Label>
                  <Input
                    type="number"
                    value={ex.sets}
                    onChange={(e) => updateExercise(ex.id, "sets", e.target.value)}
                    className={`bg-white/5 h-8 border-border text-sm ${
                      errors[`${ex.id}-sets`] ? "border-red-500/50" : ""
                    }`}
                  />
                  {errors[`${ex.id}-sets`] && (
                    <span className="text-xs text-red-400">{errors[`${ex.id}-sets`]}</span>
                  )}
                </div>
                {(ex.category === "resistance" || ex.category === "bodyweight") && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{t("Reps")}</Label>
                    <Input
                      type="number"
                      value={ex.reps}
                      onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                      className={`bg-white/5 h-8 border-border text-sm ${
                        errors[`${ex.id}-reps`] ? "border-red-500/50" : ""
                      }`}
                    />
                    {errors[`${ex.id}-reps`] && (
                      <span className="text-xs text-red-400">{errors[`${ex.id}-reps`]}</span>
                    )}
                  </div>
                )}
                {ex.category === "resistance" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Weight")}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={ex.weight}
                        onChange={(e) => updateExercise(ex.id, "weight", e.target.value)}
                        placeholder="kg"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("RPE (0-10)")}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={ex.rpe}
                        onChange={(e) => updateExercise(ex.id, "rpe", e.target.value)}
                        placeholder="e.g. 8"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                  </>
                )}
                {ex.category === "bodyweight" && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{t("Added/Assisted (kg)")}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={ex.weight}
                      onChange={(e) => updateExercise(ex.id, "weight", e.target.value)}
                      placeholder="+/- kg"
                      className="bg-white/5 h-8 border-border text-sm"
                    />
                  </div>
                )}
                {ex.category === "cardio" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Distance (km)")}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={ex.distance}
                        onChange={(e) => updateExercise(ex.id, "distance", e.target.value)}
                        placeholder="0.0"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Time (MM:SS)")}</Label>
                      <Input
                        type="text"
                        value={ex.duration}
                        onChange={(e) => updateExercise(ex.id, "duration", e.target.value)}
                        placeholder="MM:SS"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Avg HR (bpm)")}</Label>
                      <Input
                        type="number"
                        value={ex.heartRate}
                        onChange={(e) => updateExercise(ex.id, "heartRate", e.target.value)}
                        placeholder="140"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                  </>
                )}
                {ex.category === "isometric" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Time (MM:SS)")}</Label>
                      <Input
                        type="text"
                        value={ex.duration}
                        onChange={(e) => updateExercise(ex.id, "duration", e.target.value)}
                        placeholder="MM:SS"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t("Added weight (kg)")}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={ex.weight}
                        onChange={(e) => updateExercise(ex.id, "weight", e.target.value)}
                        placeholder="kg"
                        className="bg-white/5 h-8 border-border text-sm"
                      />
                    </div>
                  </>
                )}
                
                {/* Rest Time and Equipment */}
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("Rest Time")}</Label>
                  <Input
                    type="number"
                    value={ex.defaultRestTime}
                    onChange={(e) => updateExercise(ex.id, "defaultRestTime", e.target.value)}
                    placeholder="90s"
                    className="bg-white/5 h-8 border-border text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("Equipment")}</Label>
                  <select
                    value={ex.equipment}
                    onChange={(e) => updateExercise(ex.id, "equipment", e.target.value)}
                    className="bg-white/5 border border-border/80 rounded-md h-8 px-2 text-xs text-foreground focus:outline-none focus:border-brand/40 cursor-pointer"
                  >
                    <option value="none" className="bg-zinc-900">{t("none")}</option>
                    <option value="barbell" className="bg-zinc-900">{t("barbell")}</option>
                    <option value="dumbbell" className="bg-zinc-900">{t("dumbbell")}</option>
                    <option value="kettlebell" className="bg-zinc-900">{t("kettlebell")}</option>
                    <option value="cable" className="bg-zinc-900">{t("cable")}</option>
                    <option value="machine" className="bg-zinc-900">{t("machine")}</option>
                    <option value="band" className="bg-zinc-900">{t("band")}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExercise}
          className="mt-3 border-border w-full transition-all active:scale-[0.97] text-xs sm:text-sm h-8 sm:h-7"
        >
          <Plus className="size-3.5" />
          {t("Add exercise")}
        </Button>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-zinc-900 hover:bg-brand-hover h-10 transition-all active:scale-[0.97] disabled:active:scale-100 text-sm sm:text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {t("Saving...")}
          </span>
        ) : isEdit ? (
          t("Save Changes")
        ) : (
          t("Create Template")
        )}
      </Button>
    </form>
  );
}
