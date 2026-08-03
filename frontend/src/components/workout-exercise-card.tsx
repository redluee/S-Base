"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronUp, ChevronDown, MoreVertical, Edit2, History, Trash2, Trash, Timer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { ExerciseCategorySelector } from "@/components/exercise-category-selector";
import { t } from "@/lib/lang";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

interface AutoSaveInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: number | string | null | undefined;
  onSave: (val: string) => void;
}

function AutoSaveInput({ value, onSave, ...props }: AutoSaveInputProps) {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value != null ? String(value) : "");
  }, [value]);

  const handleBlur = () => {
    const canonicalProp = value != null ? String(value) : "";
    if (localValue !== canonicalProp) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

export interface WorkoutExerciseCardProps {
  ex: SessionExercise;
  exIdx: number;
  totalExercises: number;
  saving: boolean;
  replacingExerciseId: number | null;
  setReplacingExerciseId: (id: number | null) => void;
  replaceName: string;
  setReplaceName: (name: string) => void;
  replaceExercise: (id: number, name: string, category?: string, equipment?: string) => void;
  updateCategory: (idx: number, category: string) => Promise<void>;
  updateEquipment: (idx: number, equipment: string) => Promise<void>;
  removeExercise: (id: number) => void;
  moveExerciseUpDirect: (idx: number) => void;
  moveExerciseDownDirect: (idx: number) => void;
  updateSet: (exIdx: number, setIdx: number, field: keyof SessionSet, value: number | string | null | undefined) => void;
  addSet: (exIdx: number) => void;
  toggleSetCompleted: (exIdx: number, setIdx: number) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  previousSetsMap: Record<string, SessionSet[]>;
  activeRestExerciseIdx: number | null;
  activeRestSetIdx: number | null;
  restSecondsLeft: number;
  restTotalSeconds: number;
  restActive: boolean;
  lastCompletedSet: { exIdx: number; setIdx: number } | null;
  activeMenuExerciseId: number | null;
  setActiveMenuExerciseId: (id: number | null) => void;
  activeEquipmentMenuExerciseId: number | null;
  setActiveEquipmentMenuExerciseId: (id: number | null) => void;
  setHistoryExerciseName: (name: string | null, equipment?: string | null) => void;
  startRestTimer: (exIdx: number, setIdx: number, customTime?: number) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (seconds: number) => void;
  highlightZeroReps?: boolean;
}



export function normalizeCategory(cat: string | null | undefined): "resistance" | "bodyweight" | "cardio" | "isometric" {
  if (!cat) return "resistance";
  const c = cat.toLowerCase().trim();
  if (c === "free weights" || c === "freeweights" || c === "machines" || c === "resistance") return "resistance";
  if (c === "bodyweight") return "bodyweight";
  if (c === "cardio") return "cardio";
  if (c === "functional" || c === "isometric") return "isometric";
  return "resistance";
}

export function isTimedExercise(ex: SessionExercise, previousSetsMap?: Record<string, SessionSet[]>): boolean {
  const cat = normalizeCategory(ex.category);
  if (cat === "isometric" || cat === "cardio") return true;
  const firstPrevSet = previousSetsMap?.[ex.exerciseName]?.[0];
  if (ex.templateExercise?.defaultDuration != null && ex.templateExercise.defaultDuration > 0) {
    return true;
  }
  if (firstPrevSet?.duration != null && firstPrevSet.duration > 0) {
    return true;
  }
  if (ex.sets?.some((s) => s.duration != null && s.duration > 0)) {
    return true;
  }
  return false;
}

export function isSetZero(ex: SessionExercise, set: SessionSet, previousSetsMap?: Record<string, SessionSet[]>): boolean {
  if (set.completed !== 1) return false;

  const cat = normalizeCategory(ex.category);
  if (cat === "cardio") {
    const hasDuration = set.duration != null && set.duration > 0;
    const hasDistance = set.distance != null && set.distance > 0;
    return !hasDuration && !hasDistance;
  }

  const timed = isTimedExercise(ex, previousSetsMap);
  if (timed) {
    const hasDuration = set.duration != null && set.duration > 0;
    return !hasDuration;
  }

  const hasReps = set.reps != null && set.reps > 0;
  const hasDuration = set.duration != null && set.duration > 0;
  return !hasReps && !hasDuration;
}

function formatSecs(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined || isNaN(secVal)) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function parseSecs(val: string): number | null {
  if (!val || !val.trim()) return null;
  if (val.includes(":")) {
    const parts = val.split(":");
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}
export function WorkoutExerciseCard({
  ex,
  exIdx,
  totalExercises,
  replacingExerciseId,
  setReplacingExerciseId,
  replaceName,
  setReplaceName,
  replaceExercise,
  updateCategory,
  updateEquipment,
  removeExercise,
  moveExerciseUpDirect,
  moveExerciseDownDirect,
  updateSet,
  addSet,
  toggleSetCompleted,
  removeSet,
  previousSetsMap,
  activeRestExerciseIdx,
  activeRestSetIdx,
  restSecondsLeft,
  restTotalSeconds,
  restActive,
  lastCompletedSet,
  activeMenuExerciseId,
  setActiveMenuExerciseId,
  setHistoryExerciseName,
  stopRestTimer,
  adjustRestTimer,
  highlightZeroReps,
}: WorkoutExerciseCardProps) {
  const allSetsDone = ex.sets?.length > 0 && ex.sets.every((s: SessionSet) => s.completed === 1);
  const cat = normalizeCategory(ex.category);

  return (
    <div
      data-ex-id={ex.sessionExerciseId}
      className={`rounded-xl bg-card/60 border p-4 sm:p-5 relative transition-all duration-300 max-[375px]:border-0 max-[375px]:rounded-none max-[375px]:bg-transparent ${
        allSetsDone
          ? "border-brand shadow-[0_0_15px_rgba(0,227,164,0.15)] ring-1 ring-brand/35"
          : "border-border"
      }`}
    >
      {/* Exercise Card Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          {replacingExerciseId === ex.sessionExerciseId ? (
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1">
                <ExerciseAutocomplete
                  value={replaceName}
                  onChange={setReplaceName}
                  onSelect={(v, sets, reps, category, equipment) => {
                    replaceExercise(ex.sessionExerciseId!, v, category, equipment);
                  }}
                  placeholder={t("Search exercise") + "..."}
                  className="w-full h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplacingExerciseId(null);
                  setReplaceName("");
                }}
                className="h-8 text-xs text-muted-foreground hover:bg-white/5"
              >
                {t("Cancel")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-foreground text-base sm:text-lg truncate flex items-center gap-2">
                <span>{exIdx + 1}. {ex.exerciseName}</span>
                {allSetsDone && (
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-brand/20 text-brand animate-scale-in shrink-0">
                    <Check className="size-3 stroke-[3px]" />
                  </span>
                )}
              </h3>
              <div className="mt-1">
                <ExerciseCategorySelector
                  category={ex.category ?? "Free Weights"}
                  equipment={ex.equipment ?? ""}
                  onChange={(cat, eq) => {
                    if (cat !== ex.category) {
                      updateCategory(exIdx, cat);
                    }
                    updateEquipment(exIdx, eq);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reordering Controls and Kebab Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {totalExercises > 1 && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <button
                type="button"
                disabled={exIdx === 0}
                onClick={() => moveExerciseUpDirect(exIdx)}
                className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={t("Move Up")}
              >
                <ChevronUp className="size-5" />
              </button>
              <button
                type="button"
                disabled={exIdx === totalExercises - 1}
                onClick={() => moveExerciseDownDirect(exIdx)}
                className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={t("Move Down")}
              >
                <ChevronDown className="size-5" />
              </button>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() =>
                setActiveMenuExerciseId(
                  activeMenuExerciseId === ex.sessionExerciseId ? null : (ex.sessionExerciseId ?? null)
                )
              }
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <MoreVertical className="size-5" />
            </button>

            {/* Dropdown Options */}
            {activeMenuExerciseId === ex.sessionExerciseId && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveMenuExerciseId(null)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-20 py-1 text-sm">
                  <button
                    onClick={() => {
                      setReplacingExerciseId(ex.sessionExerciseId!);
                      setReplaceName("");
                      setActiveMenuExerciseId(null);
                    }}
                    className="flex w-full items-center px-4 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                  >
                    <Edit2 className="size-4 mr-2 text-zinc-500" />
                    {t("Replace Exercise")}
                  </button>
                  <button
                    onClick={() => {
                      setHistoryExerciseName(ex.exerciseName, ex.equipment);
                      setActiveMenuExerciseId(null);
                    }}
                    className="flex w-full items-center px-4 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                  >
                    <History className="size-4 mr-2 text-zinc-500" />
                    {t("View History")}
                  </button>
                  <hr className="border-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      if (confirm(t("Remove this exercise?"))) {
                        removeExercise(ex.sessionExerciseId!);
                      }
                      setActiveMenuExerciseId(null);
                    }}
                    className="flex w-full items-center px-4 py-2 text-red-400 hover:bg-zinc-800 text-left"
                  >
                    <Trash2 className="size-4 mr-2" />
                    {t("Remove")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sets Table */}
      {ex.sets?.length > 0 && (() => {
        const isTimed = isTimedExercise(ex, previousSetsMap);

        return (
          <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4 max-[375px]:bg-card/60">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left py-2 px-2 font-normal w-8">{t("Set")}</th>
                  <th className="text-left py-2 px-3 font-normal">{t("Target")}</th>
                  {(cat === "resistance") && (
                    <>
                      <th className="text-center py-2 px-3 font-normal w-28">kg</th>
                      <th className="text-center py-2 px-3 font-normal w-24">
                        {isTimed ? t("Time (MM:SS)") : t("Reps")}
                      </th>
                    </>
                  )}
                  {cat === "bodyweight" && (
                    <>
                      <th className="text-center py-2 px-3 font-normal w-28">{t("Added/Assisted (kg)")}</th>
                      <th className="text-center py-2 px-3 font-normal w-24">
                        {isTimed ? t("Time (MM:SS)") : t("Reps")}
                      </th>
                    </>
                  )}
                  {cat === "cardio" && (
                    <>
                      <th className="text-center py-2 px-3 font-normal w-24">{t("Distance (km)")}</th>
                      <th className="text-center py-2 px-3 font-normal w-24">{t("Time (MM:SS)")}</th>
                      <th className="text-center py-2 px-3 font-normal w-24">{t("Avg HR (bpm)")}</th>
                    </>
                  )}
                  {cat === "isometric" && (
                    <>
                      <th className="text-center py-2 px-3 font-normal w-24">{t("Added weight (kg)")}</th>
                      <th className="text-center py-2 px-3 font-normal w-24">{t("Time (MM:SS)")}</th>
                    </>
                  )}
                  <th className="text-center py-2 px-3 font-normal w-16">{t("Done")}</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((set: SessionSet, setIdx: number) => {
                  const prevSets = previousSetsMap[ex.exerciseName];
                  const prevSet = prevSets?.[setIdx] ?? prevSets?.[prevSets.length - 1];
                  
                  let ghostText = "—";
                  let targetSource: Partial<SessionSet> | null = null;

                  const hasPrevData = prevSet && (
                    prevSet.reps != null ||
                    prevSet.weight != null ||
                    prevSet.distance != null ||
                    prevSet.duration != null ||
                    prevSet.heartRate != null
                  );

                  if (hasPrevData) {
                    targetSource = prevSet;
                  } else if (ex.templateExercise) {
                    targetSource = {
                      reps: ex.templateExercise.defaultReps,
                      weight: ex.templateExercise.defaultWeight,
                      distance: ex.templateExercise.defaultDistance,
                      duration: ex.templateExercise.defaultDuration,
                      rpe: ex.templateExercise.defaultRpe,
                      heartRate: ex.templateExercise.defaultHeartRate,
                    };
                  } else {
                    targetSource = set;
                  }

                  if (targetSource) {
                    const hasTimeTarget =
                      targetSource.duration != null &&
                      targetSource.duration > 0 &&
                      (targetSource.reps == null || targetSource.reps === 0 || cat === "isometric");

                    if (hasTimeTarget) {
                      const durStr = formatSecs(targetSource.duration) || `${targetSource.duration}s`;
                      if (targetSource.weight != null && targetSource.weight !== 0) {
                        const weightSign = (cat === "bodyweight" && targetSource.weight > 0) ? "+" : "";
                        ghostText = `${weightSign}${targetSource.weight} KG x ${durStr}`;
                      } else if (targetSource.distance != null && targetSource.distance > 0) {
                        ghostText = `${targetSource.distance} km x ${durStr}`;
                      } else {
                        ghostText = durStr;
                      }
                    } else if (cat === "resistance") {
                      const reps = targetSource.reps ?? 10;
                      const weight = targetSource.weight ?? 0;
                      ghostText = `${reps} x ${weight} KG`;
                    } else if (cat === "bodyweight") {
                      const reps = targetSource.reps ?? 10;
                      const weight = targetSource.weight;
                      if (weight != null && weight !== 0) {
                        const weightSign = weight > 0 ? "+" : "";
                        ghostText = `${weightSign}${weight} KG x ${reps}`;
                      } else {
                        ghostText = `${reps} reps`;
                      }
                    } else if (cat === "cardio") {
                      const dist = targetSource.distance ?? 0;
                      const dur = targetSource.duration ?? 0;
                      ghostText = `${dist} km x ${formatSecs(dur) || "0:00"}`;
                    } else if (cat === "isometric") {
                      const dur = targetSource.duration ?? 0;
                      const weight = targetSource.weight;
                      const durStr = formatSecs(dur) || `${dur}s`;
                      
                      if (weight != null && weight !== 0) {
                        ghostText = `${weight} KG x ${durStr}`;
                      } else {
                        ghostText = durStr;
                      }
                    }
                  }

                  const colSpanVal = cat === "cardio" ? 6 : 5;
                  const isZero = highlightZeroReps && isSetZero(ex, set, previousSetsMap);

                  return (
                    <React.Fragment key={setIdx}>
                      <tr
                        className={`border-b border-border/20 last:border-0 transition-colors duration-150 ${
                          set.completed
                            ? "bg-brand/5 opacity-70"
                            : "hover:bg-white/[0.01]"
                        }`}
                      >
                        {/* Set # */}
                        <td className="py-2.5 px-3 font-medium text-zinc-400 align-middle">
                          {set.setNumber}
                        </td>

                        {/* Ghost/Target text */}
                        <td className="py-2.5 px-3 text-muted-foreground align-middle italic text-xs">
                          {ghostText}
                        </td>

                        {/* Dynamic Inputs based on Category */}
                        {(cat === "resistance") && (
                          <>
                            <td className="py-2 px-2 align-middle">
                              <AutoSaveInput
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                placeholder={targetSource?.weight != null ? String(targetSource.weight) : "0"}
                                value={set.weight}
                                onSave={(val) => updateSet(exIdx, setIdx, "weight", val ? Math.max(0, Number(val)) : null)}
                                className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                              />
                            </td>
                            <td className="py-2 px-2 align-middle">
                              {isTimed ? (
                                <AutoSaveInput
                                  type="text"
                                  placeholder={targetSource?.duration != null ? formatSecs(targetSource.duration) : "MM:SS"}
                                  value={set.duration != null ? formatSecs(set.duration) : ""}
                                  onSave={(val) => updateSet(exIdx, setIdx, "duration", parseSecs(val))}
                                  className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                    isZero
                                      ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                      : "border-border/80 focus-visible:border-brand/40"
                                  }`}
                                />
                              ) : (
                                <AutoSaveInput
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  placeholder={targetSource?.reps != null ? String(targetSource.reps) : "0"}
                                  value={set.reps}
                                  onSave={(val) => updateSet(exIdx, setIdx, "reps", val ? Math.max(0, Number(val)) : null)}
                                  className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                    isZero
                                      ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                      : "border-border/80 focus-visible:border-brand/40"
                                  }`}
                                />
                              )}
                            </td>
                          </>
                        )}

                        {cat === "bodyweight" && (
                          <>
                            <td className="py-2 px-2 align-middle">
                              <AutoSaveInput
                                type="number"
                                min="0"
                                step="any"
                                placeholder={targetSource?.weight != null ? String(targetSource.weight) : "0"}
                                value={set.weight}
                                onSave={(val) => updateSet(exIdx, setIdx, "weight", val ? Math.max(0, Number(val)) : null)}
                                className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                              />
                            </td>
                            <td className="py-2 px-2 align-middle">
                              {isTimed ? (
                                <AutoSaveInput
                                  type="text"
                                  placeholder={targetSource?.duration != null ? formatSecs(targetSource.duration) : "MM:SS"}
                                  value={set.duration != null ? formatSecs(set.duration) : ""}
                                  onSave={(val) => updateSet(exIdx, setIdx, "duration", parseSecs(val))}
                                  className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                    isZero
                                      ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                      : "border-border/80 focus-visible:border-brand/40"
                                  }`}
                                />
                              ) : (
                                <AutoSaveInput
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  placeholder={targetSource?.reps != null ? String(targetSource.reps) : "0"}
                                  value={set.reps}
                                  onSave={(val) => updateSet(exIdx, setIdx, "reps", val ? Math.max(0, Number(val)) : null)}
                                  className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                    isZero
                                      ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                      : "border-border/80 focus-visible:border-brand/40"
                                  }`}
                                />
                              )}
                            </td>
                          </>
                        )}

                      {cat === "cardio" && (
                        <>
                          <td className="py-2 px-2 align-middle">
                            <AutoSaveInput
                              type="number"
                              min="0"
                              step="any"
                              placeholder={targetSource?.distance != null ? String(targetSource.distance) : "0.0"}
                              value={set.distance}
                              onSave={(val) => updateSet(exIdx, setIdx, "distance", val ? Math.max(0, Number(val)) : null)}
                              className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                isZero
                                  ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                  : "border-border/80 focus-visible:border-brand/40"
                              }`}
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <AutoSaveInput
                              type="text"
                              placeholder={targetSource?.duration != null ? formatSecs(targetSource.duration) : "MM:SS"}
                              value={set.duration != null ? formatSecs(set.duration) : ""}
                              onSave={(val) => updateSet(exIdx, setIdx, "duration", parseSecs(val))}
                              className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                isZero
                                  ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                  : "border-border/80 focus-visible:border-brand/40"
                              }`}
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <AutoSaveInput
                              type="number"
                              min="0"
                              placeholder={targetSource?.heartRate != null ? String(targetSource.heartRate) : "140"}
                              value={set.heartRate}
                              onSave={(val) => updateSet(exIdx, setIdx, "heartRate", val ? Math.max(0, Number(val)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                        </>
                      )}

                      {cat === "isometric" && (
                        <>
                          <td className="py-2 px-2 align-middle">
                            <AutoSaveInput
                              type="number"
                              min="0"
                              step="any"
                              placeholder={targetSource?.weight != null ? String(targetSource.weight) : "0"}
                              value={set.weight}
                              onSave={(val) => updateSet(exIdx, setIdx, "weight", val ? Math.max(0, Number(val)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <AutoSaveInput
                              type="text"
                              placeholder={targetSource?.duration != null ? formatSecs(targetSource.duration) : "MM:SS"}
                              value={set.duration != null ? formatSecs(set.duration) : ""}
                              onSave={(val) => updateSet(exIdx, setIdx, "duration", parseSecs(val))}
                              className={`bg-white/5 h-8 text-center text-sm font-semibold rounded-md transition-all ${
                                isZero
                                  ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                  : "border-border/80 focus-visible:border-brand/40"
                              }`}
                            />
                          </td>
                        </>
                      )}

                      {/* Done / Trash */}
                      <td className="py-2 px-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSetCompleted(exIdx, setIdx)}
                            aria-label={t("Mark set as completed")}
                            className={`size-7 sm:size-8 rounded-md flex items-center justify-center transition-all duration-75 active:scale-[0.9] border group/checkbtn relative ${
                              set.completed
                                ? "bg-brand border-brand text-zinc-900"
                                : "bg-white/5 border-border text-zinc-500 hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
                            }`}
                          >
                            {set.completed ? (
                              <>
                                <Check className="size-4 stroke-[3px] animate-scale-in" />
                                {lastCompletedSet?.exIdx === exIdx && lastCompletedSet?.setIdx === setIdx && (
                                  <>
                                    <span className="absolute size-1.5 rounded-full bg-brand animate-particle-1 pointer-events-none" />
                                    <span className="absolute size-1.5 rounded-full bg-brand animate-particle-2 pointer-events-none" />
                                    <span className="absolute size-1.5 rounded-full bg-brand animate-particle-3 pointer-events-none" />
                                    <span className="absolute size-1.5 rounded-full bg-brand animate-particle-4 pointer-events-none" />
                                  </>
                                )}
                              </>
                            ) : (
                              <Check className="size-4 opacity-25 group-hover/checkbtn:opacity-100 transition-opacity text-zinc-500 group-hover/checkbtn:text-brand" />
                            )}
                          </button>
                          {ex.sets.length > 1 && set.completed !== 1 && (
                            <button
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                            >
                              <Trash className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {setIdx < ex.sets.length - 1 && (() => {
                      const isSetAboveCompleted = set.completed === 1;
                      const isCurrentRestTimer = activeRestExerciseIdx === exIdx && activeRestSetIdx === setIdx;
                      const hasActiveTimer = isCurrentRestTimer && restSecondsLeft > 0;
                      const isDone = !hasActiveTimer;

                      return (
                        <tr className={`transition-all duration-300 ${
                          isDone 
                            ? "h-0 border-none bg-transparent overflow-hidden" 
                            : `border-b border-border/10 ${isSetAboveCompleted ? "bg-zinc-950/50" : "bg-zinc-950/25"}`
                        }`}>
                          <td colSpan={colSpanVal} className="p-0 transition-all duration-300 relative overflow-hidden">
                            {/* Progress Background */}
                            {hasActiveTimer && (
                              <div 
                                className="absolute inset-0 bg-brand/10 transition-all duration-1000 ease-linear pointer-events-none border-none border-0"
                                style={{ width: `${(restSecondsLeft / restTotalSeconds) * 100}%` }}
                              />
                            )}

                            <div 
                              className={`transition-all duration-300 ease-in-out overflow-hidden relative w-full border-none border-0 ${
                                isDone 
                                  ? "max-h-0 opacity-0 py-0 px-3 pointer-events-none" 
                                  : isSetAboveCompleted 
                                    ? "max-h-20 opacity-100 py-3 sm:py-3.5 px-3 min-h-[56px]" 
                                    : "max-h-12 opacity-100 py-1 px-3"
                              }`}
                            >
                              <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400 w-full">
                                {isSetAboveCompleted ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Timer className={`size-4 ${hasActiveTimer && restActive ? "text-brand animate-pulse" : "text-zinc-500"}`} />
                                      {hasActiveTimer && (
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="font-mono text-base font-bold text-brand tabular-nums">
                                            {formatTime(restSecondsLeft)}
                                          </span>
                                          {/* Adjust buttons */}
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => adjustRestTimer(15)}
                                              className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 hover:bg-zinc-700 active:scale-95"
                                            >
                                              +15s
                                            </button>
                                            <button
                                              onClick={() => adjustRestTimer(-15)}
                                              className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                                              disabled={restSecondsLeft <= 15}
                                            >
                                              -15s
                                            </button>
                                            <button
                                              onClick={stopRestTimer}
                                              className="px-2 py-0.5 rounded bg-red-950/55 border border-red-900/30 text-[10px] text-red-300 hover:bg-red-900/40 active:scale-95"
                                            >
                                              {t("Skip")}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-2 w-full" />
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    })()}

      {/* Add Set Button */}
      <Button
        variant="ghost"
        onClick={() => addSet(exIdx)}
        className="w-full border border-dashed border-border/60 text-muted-foreground hover:text-foreground text-xs h-8 rounded-lg transition-colors hover:bg-white/[0.01]"
      >
        <Plus className="size-3.5 mr-1" />
        {t("Add Set")}
      </Button>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}
