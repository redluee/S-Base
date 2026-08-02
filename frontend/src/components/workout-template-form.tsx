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
import { Plus, X, Loader2, Dumbbell } from "lucide-react";

function BarbellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 5h2v14H6zM16 5h2v14h-2zM2 12h4M18 12h4M6 12h12" />
      <path d="M3 8h1v8H3zM20 8h1v8h-1z" />
    </svg>
  );
}

function KettlebellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a4.5 4.5 0 0 0-4.5 4.5V10h9V7.5A4.5 4.5 0 0 0 12 3z" />
      <path d="M6 10h12a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" />
    </svg>
  );
}

function CableIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v13" />
      <path d="M8 15h8M8 15v3a4 4 0 0 0 8 0v-3" />
      <path d="M12 18v4" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
    </svg>
  );
}

function MachineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V4h16v16M4 8h16M4 12h16M4 16h16" />
      <circle cx="12" cy="6" r="1.5" />
    </svg>
  );
}

function BandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="12" rx="7" ry="4" transform="rotate(-15 12 12)" />
    </svg>
  );
}

function BallIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
      <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
    </svg>
  );
}

function NoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

function EquipmentIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "barbell":
      return <BarbellIcon className={className} />;
    case "dumbbell":
      return <Dumbbell className={className} />;
    case "kettlebell":
      return <KettlebellIcon className={className} />;
    case "cable":
      return <CableIcon className={className} />;
    case "machine":
      return <MachineIcon className={className} />;
    case "band":
      return <BandIcon className={className} />;
    case "ball":
      return <BallIcon className={className} />;
    default:
      return <NoneIcon className={className} />;
  }
}

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
      equipment: e.equipment ?? "dumbbell",
    })) ?? [{ id: "ex-0", name: "", category: "resistance", sets: "3", reps: "10", weight: "", distance: "", duration: "", rpe: "", heartRate: "", defaultRestTime: "90", equipment: "dumbbell" }],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addExercise() {
    const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setExercises((prev) => [...prev, { id, name: "", category: "resistance", sets: "3", reps: "10", weight: "", distance: "", duration: "", rpe: "", heartRate: "", defaultRestTime: "90", equipment: "dumbbell" }]);
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
              min="0"
              value={estimatedTime}
              onChange={(e) => {
                if (!e.target.value.startsWith("-")) setEstimatedTime(e.target.value);
              }}
              placeholder="45"
              className="bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 border-border"
            />
          </div>
        </div>
      </div>

      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("Exercises")}</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
            {exercises.length} {exercises.length === 1 ? t("exercise") : t("exercises")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('No exercises yet. Click "Add" to get started.')}
            </p>
          )}
          {exercises.map((ex, i) => (
            <div
              key={ex.id}
              className="rounded-lg border border-border/50 bg-white/[0.02] p-3 sm:p-4 transition-colors hover:border-border/80 flex flex-col gap-3"
            >
              {/* Exercise autocomplete and delete button */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("Exercise")}
                  </Label>
                  <ExerciseAutocomplete
                    value={ex.name}
                    onChange={(v) => updateExercise(ex.id, "name", v)}
                    onSelect={(v, defaultSets, defaultReps, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration) => {
                      updateExercise(ex.id, "name", v);
                      if (category) updateExercise(ex.id, "category", category);
                      if (equipment) updateExercise(ex.id, "equipment", equipment);
                      if (defaultSets !== undefined && defaultSets !== null) {
                        updateExercise(ex.id, "sets", String(defaultSets));
                      }
                      if (defaultReps !== undefined && defaultReps !== null) {
                        updateExercise(ex.id, "reps", String(defaultReps));
                      }
                      if (defaultRestTime !== undefined && defaultRestTime !== null) {
                        updateExercise(ex.id, "defaultRestTime", String(defaultRestTime));
                      } else {
                        updateExercise(ex.id, "defaultRestTime", "90");
                      }
                      if (defaultWeight !== undefined && defaultWeight !== null) {
                        updateExercise(ex.id, "weight", String(defaultWeight));
                      } else {
                        updateExercise(ex.id, "weight", "");
                      }
                      if (defaultDistance !== undefined && defaultDistance !== null) {
                        updateExercise(ex.id, "distance", String(defaultDistance));
                      } else {
                        updateExercise(ex.id, "distance", "");
                      }
                      if (defaultDuration !== undefined && defaultDuration !== null) {
                        updateExercise(ex.id, "duration", formatDuration(defaultDuration));
                      } else {
                        updateExercise(ex.id, "duration", "");
                      }
                    }}
                    placeholder={t("Exercise") + ` ${i + 1}`}
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExercise(ex.id)}
                  className="shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 h-9 w-9 mt-5"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {/* Fields Grid (2 columns on mobile, 3 columns on desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                {/* Category */}
                <div className="grid gap-1 col-span-1">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Category")}</Label>
                  <select
                    value={ex.category}
                    onChange={(e) => updateExercise(ex.id, "category", e.target.value)}
                    className="bg-white/5 border border-border/80 rounded-md h-9 px-3 text-xs text-foreground focus:outline-none focus:border-brand/40 cursor-pointer w-full"
                  >
                    <option value="resistance" className="bg-zinc-900">{t("Resistance")}</option>
                    <option value="bodyweight" className="bg-zinc-900">{t("Bodyweight")}</option>
                    <option value="cardio" className="bg-zinc-900">{t("Cardio")}</option>
                    <option value="isometric" className="bg-zinc-900">{t("Isometric")}</option>
                  </select>
                </div>

                {/* Equipment (Materiaal) */}
                <div className="grid gap-1 col-span-1">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Equipment")}</Label>
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    <select
                      value={ex.equipment}
                      onChange={(e) => updateExercise(ex.id, "equipment", e.target.value)}
                      className="bg-white/5 border border-border/80 rounded-md h-9 px-3 text-xs text-foreground focus:outline-none focus:border-brand/40 cursor-pointer flex-1 min-w-0"
                    >
                      <option value="none" className="bg-zinc-900">{t("none")}</option>
                      <option value="barbell" className="bg-zinc-900">{t("barbell")}</option>
                      <option value="dumbbell" className="bg-zinc-900">{t("dumbbell")}</option>
                      <option value="kettlebell" className="bg-zinc-900">{t("kettlebell")}</option>
                      <option value="cable" className="bg-zinc-900">{t("cable")}</option>
                      <option value="machine" className="bg-zinc-900">{t("machine")}</option>
                      <option value="band" className="bg-zinc-900">{t("band")}</option>
                      <option value="ball" className="bg-zinc-900">{t("ball")}</option>
                    </select>
                    <div className="shrink-0 w-9 h-9 rounded-md bg-white/5 border border-border/80 flex items-center justify-center text-brand">
                      <EquipmentIcon type={ex.equipment} className="size-4" />
                    </div>
                  </div>
                </div>

                {/* Sets & Reps container if category has them */}
                {(ex.category === "resistance" || ex.category === "bodyweight") && (
                  <div className="grid gap-1 col-span-1">
                    <Label className="text-xs font-medium text-muted-foreground">{t("Sets & Reps")}</Label>
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      {/* Sets field */}
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          min="0"
                          value={ex.sets}
                          onChange={(e) => {
                            if (!e.target.value.startsWith("-")) updateExercise(ex.id, "sets", e.target.value);
                          }}
                          placeholder="3"
                          className={`bg-white/5 h-9 border-border text-sm ${
                            errors[`${ex.id}-sets`] ? "border-red-500/50" : ""
                          }`}
                        />
                      </div>

                      {/* An X in between the fields */}
                      <span className="text-muted-foreground text-xs font-bold select-none px-1">✕</span>

                      {/* Reps field */}
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          min="0"
                          value={ex.reps}
                          onChange={(e) => {
                            if (!e.target.value.startsWith("-")) updateExercise(ex.id, "reps", e.target.value);
                          }}
                          placeholder="10"
                          className={`bg-white/5 h-9 border-border text-sm ${
                            errors[`${ex.id}-reps`] ? "border-red-500/50" : ""
                          }`}
                        />
                      </div>
                    </div>
                    {/* Error reporting */}
                    {(errors[`${ex.id}-sets`] || errors[`${ex.id}-reps`]) && (
                      <div className="text-xs text-red-400 mt-1 flex flex-col gap-0.5">
                        {errors[`${ex.id}-sets`] && <span>{errors[`${ex.id}-sets`]}</span>}
                        {errors[`${ex.id}-reps`] && <span>{errors[`${ex.id}-reps`]}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Weight for resistance */}
                {ex.category === "resistance" && (
                  <div className="grid gap-1 col-span-1">
                    <Label className="text-xs font-medium text-muted-foreground">{t("Weight")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={ex.weight}
                      onChange={(e) => {
                        if (!e.target.value.startsWith("-")) updateExercise(ex.id, "weight", e.target.value);
                      }}
                      placeholder="kg"
                      className="bg-white/5 h-9 border-border text-sm"
                    />
                  </div>
                )}

                {/* Weight for bodyweight (added/assisted) */}
                {ex.category === "bodyweight" && (
                  <div className="grid gap-1 col-span-1">
                    <Label className="text-xs font-medium text-muted-foreground">{t("Added/Assisted (kg)")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={ex.weight}
                      onChange={(e) => {
                        if (!e.target.value.startsWith("-")) updateExercise(ex.id, "weight", e.target.value);
                      }}
                      placeholder="+/- kg"
                      className="bg-white/5 h-9 border-border text-sm"
                    />
                  </div>
                )}

                {/* Cardio: only distance and duration, NO avg HR */}
                {ex.category === "cardio" && (
                  <>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Sets")}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={ex.sets}
                        onChange={(e) => {
                          if (!e.target.value.startsWith("-")) updateExercise(ex.id, "sets", e.target.value);
                        }}
                        className={`bg-white/5 h-9 border-border text-sm ${
                          errors[`${ex.id}-sets`] ? "border-red-500/50" : ""
                        }`}
                      />
                      {errors[`${ex.id}-sets`] && <span className="text-xs text-red-400">{errors[`${ex.id}-sets`]}</span>}
                    </div>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Distance (km)")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ex.distance}
                        onChange={(e) => {
                          if (!e.target.value.startsWith("-")) updateExercise(ex.id, "distance", e.target.value);
                        }}
                        placeholder="0.0"
                        className="bg-white/5 h-9 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Time (MM:SS)")}</Label>
                      <Input
                        type="text"
                        value={ex.duration}
                        onChange={(e) => updateExercise(ex.id, "duration", e.target.value)}
                        placeholder="MM:SS"
                        className="bg-white/5 h-9 border-border text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Isometric: duration, added weight, sets */}
                {ex.category === "isometric" && (
                  <>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Sets")}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={ex.sets}
                        onChange={(e) => {
                          if (!e.target.value.startsWith("-")) updateExercise(ex.id, "sets", e.target.value);
                        }}
                        className={`bg-white/5 h-9 border-border text-sm ${
                          errors[`${ex.id}-sets`] ? "border-red-500/50" : ""
                        }`}
                      />
                      {errors[`${ex.id}-sets`] && <span className="text-xs text-red-400">{errors[`${ex.id}-sets`]}</span>}
                    </div>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Time (MM:SS)")}</Label>
                      <Input
                        type="text"
                        value={ex.duration}
                        onChange={(e) => updateExercise(ex.id, "duration", e.target.value)}
                        placeholder="MM:SS"
                        className="bg-white/5 h-9 border-border text-sm"
                      />
                    </div>
                    <div className="grid gap-1 col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground">{t("Added weight (kg)")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ex.weight}
                        onChange={(e) => {
                          if (!e.target.value.startsWith("-")) updateExercise(ex.id, "weight", e.target.value);
                        }}
                        placeholder="kg"
                        className="bg-white/5 h-9 border-border text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Rest Time (shown for all categories) */}
                <div className="grid gap-1 col-span-1">
                  <Label className="text-xs font-medium text-muted-foreground">{t("Rest Time")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={ex.defaultRestTime}
                    onChange={(e) => {
                      if (!e.target.value.startsWith("-")) updateExercise(ex.id, "defaultRestTime", e.target.value);
                    }}
                    placeholder="90s"
                    className="bg-white/5 h-9 border-border text-sm"
                  />
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
