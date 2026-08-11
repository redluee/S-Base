/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Download, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";

export function normalizeImportedWorkout(data: any) {
  if (!data || typeof data !== "object") {
    throw new Error(t("Invalid JSON format"));
  }

  const name = (data.name || data.title || "").toString().trim();
  if (!name) {
    throw new Error(t("Template name is required in JSON"));
  }

  const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
  if (rawExercises.length === 0) {
    throw new Error(t("At least one exercise is required in JSON"));
  }

  const exercises = rawExercises.map((ex: any, idx: number) => {
    const exerciseName = (ex.exerciseName || ex.name || "").toString().trim();
    if (!exerciseName) {
      throw new Error(`${t("Exercise")} #${idx + 1}: ${t("Exercise name is required.")}`);
    }

    let setsCount = 1;
    let repsCount = 10;
    let weightVal: number | undefined = undefined;
    let distanceVal: number | undefined = undefined;
    let durationVal: number | undefined = undefined;

    if (ex.defaultSets != null) setsCount = Number(ex.defaultSets);
    else if (ex.sets != null) {
      if (Array.isArray(ex.sets)) {
        setsCount = ex.sets.length || 1;
        const firstSet = ex.sets[0];
        if (firstSet) {
          if (firstSet.reps != null) repsCount = Number(firstSet.reps);
          if (firstSet.weight != null) weightVal = Number(firstSet.weight);
          if (firstSet.distance != null) distanceVal = Number(firstSet.distance);
          if (firstSet.duration != null) durationVal = Number(firstSet.duration);
        }
      } else {
        setsCount = Number(ex.sets);
      }
    }

    if (ex.defaultReps != null) repsCount = Number(ex.defaultReps);
    else if (typeof ex.reps === "number") repsCount = Number(ex.reps);

    if (ex.defaultWeight != null) weightVal = Number(ex.defaultWeight);
    else if (typeof ex.weight === "number") weightVal = Number(ex.weight);

    if (ex.defaultDistance != null) distanceVal = Number(ex.defaultDistance);
    else if (typeof ex.distance === "number") distanceVal = Number(ex.distance);

    if (ex.defaultDuration != null) durationVal = Number(ex.defaultDuration);
    else if (typeof ex.duration === "number") durationVal = Number(ex.duration);

    const defaultRestTime = ex.defaultRestTime != null ? Number(ex.defaultRestTime) : undefined;
    const equipment = ex.equipment ? String(ex.equipment).trim() : undefined;
    const perSide = ex.perSide ? 1 : 0;
    const category = ex.category ? String(ex.category).trim() : "Free Weights";

    return {
      exerciseName,
      category,
      sets: Math.max(1, setsCount),
      reps: Math.max(0, repsCount),
      weight: weightVal,
      distance: distanceVal,
      duration: durationVal,
      defaultRestTime,
      equipment,
      perSide,
    };
  });

  return {
    name,
    description: data.description || data.notes || undefined,
    targetMuscleGroups: data.targetMuscleGroups || undefined,
    estimatedTime: data.estimatedTime ? Number(data.estimatedTime) : undefined,
    exercises,
  };
}

export function WorkoutImportModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  let parsedPreview: ReturnType<typeof normalizeImportedWorkout> | null = null;
  if (jsonText.trim()) {
    try {
      const data = JSON.parse(jsonText);
      parsedPreview = normalizeImportedWorkout(data);
    } catch {
      // Don't show parse error immediately while typing
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        setError(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setError(null);
    if (!jsonText.trim()) {
      setError(t("Paste JSON or upload a file"));
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      const normalized = normalizeImportedWorkout(data);
      setIsImporting(true);

      const created = await api.workouts.templates.create(normalized);
      setIsOpen(false);
      setJsonText("");
      setIsImporting(false);

      if (created?.templateId) {
        router.push(`/workouts/t/${created.templateId}`);
      } else {
        router.push("/workouts");
      }
      router.refresh();
    } catch (e: any) {
      setIsImporting(false);
      setError(e.message || t("Invalid JSON format"));
    }
  }

  function handleClose() {
    setIsOpen(false);
    setJsonText("");
    setError(null);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="font-medium flex items-center gap-1.5 active:scale-[0.97] transition-all"
        title={t("Import Sjabloon")}
      >
        <Download className="size-3.5" />
        <span>{t("Import")}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card rounded-2xl ring-1 ring-foreground/10 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-brand/10 text-brand shrink-0">
                <Download className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("Import Workout Sjabloon")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("Paste JSON or upload a file")}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-1.5 py-1 -mx-1.5">
              {error && (
                <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 m-0.5">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    JSON Data
                  </label>
                  <label className="text-xs text-brand hover:underline cursor-pointer flex items-center gap-1 font-medium">
                    <Upload className="size-3" />
                    <span>{t("Select JSON file")}</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="p-0.5">
                  <textarea
                    rows={6}
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setError(null);
                    }}
                    placeholder={`{\n  "name": "Full Body A",\n  "exercises": [\n    {\n      "exerciseName": "Bench Press",\n      "sets": 3,\n      "reps": 10\n    }\n  ]\n}`}
                    className="w-full rounded-xl bg-foreground/5 border border-white/10 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {parsedPreview && (
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3.5 space-y-2 text-xs m-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      {parsedPreview.name}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {parsedPreview.exercises.length} {parsedPreview.exercises.length === 1 ? t("exercise") : t("exercises")}
                    </span>
                  </div>

                  {parsedPreview.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2">
                      {parsedPreview.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/5 space-y-1 max-h-32 overflow-y-auto pr-1">
                    {parsedPreview.exercises.map((ex: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-zinc-300">
                        <span className="truncate font-medium">{ex.exerciseName}</span>
                        <span className="text-muted-foreground text-[11px] shrink-0 ml-2">
                          {ex.sets}x {ex.reps} reps {ex.weight ? `• ${ex.weight} kg` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 mt-1 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isImporting}
              >
                {t("Annuleren")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={isImporting || !jsonText.trim()}
                className="bg-brand text-zinc-900 hover:bg-brand-hover font-medium"
              >
                {isImporting ? t("Importing...") : t("Import")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
