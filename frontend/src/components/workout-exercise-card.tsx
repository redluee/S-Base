"use client";

import React, { useState } from "react";
import { Check, ChevronUp, ChevronDown, MoreVertical, Edit2, History, Trash2, Trash, Timer, Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { t } from "@/lib/lang";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

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
  setHistoryExerciseName: (name: string | null) => void;
  startRestTimer: (exIdx: number, setIdx: number, customTime?: number) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (seconds: number) => void;
}

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

function NoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

const rpeColors = [
  "",
  "bg-blue-500",
  "bg-sky-400",
  "bg-sky-400",
  "bg-green-500",
  "bg-green-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-red-500",
];

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
    default:
      return <NoneIcon className={className} />;
  }
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
  saving,
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
  activeEquipmentMenuExerciseId,
  setActiveEquipmentMenuExerciseId,
  setHistoryExerciseName,
  startRestTimer,
  stopRestTimer,
  adjustRestTimer,
}: WorkoutExerciseCardProps) {
  const [rpePickerPos, setRpePickerPos] = useState<{ exIdx: number; setIdx: number; top: number; left: number; width: number } | null>(null);
  const allSetsDone = ex.sets?.length > 0 && ex.sets.every((s: SessionSet) => s.completed === 1);
  const cat = ex.category ?? "resistance";

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
              <select
                value={ex.category ?? "resistance"}
                onChange={(e) => updateCategory(exIdx, e.target.value)}
                className="bg-transparent text-xs text-muted-foreground border-0 hover:text-foreground cursor-pointer focus:outline-none w-fit"
              >
                <option value="resistance" className="bg-zinc-900">{t("Resistance")}</option>
                <option value="bodyweight" className="bg-zinc-900">{t("Bodyweight")}</option>
                <option value="cardio" className="bg-zinc-900">{t("Cardio")}</option>
                <option value="isometric" className="bg-zinc-900">{t("Isometric")}</option>
              </select>
            </div>
          )}
        </div>

        {/* Reordering Controls and Kebab Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {totalExercises > 1 && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <button
                type="button"
                disabled={exIdx === 0 || saving}
                onClick={() => moveExerciseUpDirect(exIdx)}
                className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={t("Move Up")}
              >
                <ChevronUp className="size-5" />
              </button>
              <button
                type="button"
                disabled={exIdx === totalExercises - 1 || saving}
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
              type="button"
              onClick={() =>
                setActiveEquipmentMenuExerciseId(
                  activeEquipmentMenuExerciseId === ex.sessionExerciseId ? null : (ex.sessionExerciseId ?? null)
                )
              }
              className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
              title={t("Equipment")}
            >
              <EquipmentIcon type={ex.equipment ?? "none"} className="size-5" />
            </button>

            {activeEquipmentMenuExerciseId === ex.sessionExerciseId && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveEquipmentMenuExerciseId(null)}
                />
                <div className="absolute right-0 mt-1 w-44 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-20 py-1 text-sm">
                  {[
                    { value: "none", label: t("none") },
                    { value: "barbell", label: t("barbell") },
                    { value: "dumbbell", label: t("dumbbell") },
                    { value: "kettlebell", label: t("kettlebell") },
                    { value: "cable", label: t("cable") },
                    { value: "machine", label: t("machine") },
                    { value: "band", label: t("band") },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        updateEquipment(exIdx, opt.value);
                        setActiveEquipmentMenuExerciseId(null);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left transition-colors hover:bg-zinc-800 ${
                        (ex.equipment ?? "none") === opt.value
                          ? "text-brand font-medium"
                          : "text-zinc-300"
                      }`}
                    >
                      <span className="mr-2.5 shrink-0 text-brand">
                        <EquipmentIcon type={opt.value} className="size-4" />
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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
                      setHistoryExerciseName(ex.exerciseName);
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
      {ex.sets?.length > 0 && (
        <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4 max-[375px]:bg-card/60">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-normal w-8">{t("Set")}</th>
                <th className="text-left py-2 px-3 font-normal">{t("Target")}</th>
                {(cat === "resistance") && (
                  <>
                    <th className="text-center py-2 px-3 font-normal w-28">kg</th>
                    <th className="text-center py-2 px-3 font-normal w-14">{t("Reps")}</th>
                    <th className="text-center py-2 px-3 font-normal w-14">{t("RPE")}</th>
                  </>
                )}
                {cat === "bodyweight" && (
                  <>
                    <th className="text-center py-2 px-3 font-normal w-28">{t("Added/Assisted (kg)")}</th>
                    <th className="text-center py-2 px-3 font-normal w-14">{t("Reps")}</th>
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
                if (ex.templateExercise) {
                  targetSource = {
                    reps: ex.templateExercise.defaultReps,
                    weight: ex.templateExercise.defaultWeight,
                    distance: ex.templateExercise.defaultDistance,
                    duration: ex.templateExercise.defaultDuration,
                    rpe: ex.templateExercise.defaultRpe,
                    heartRate: ex.templateExercise.defaultHeartRate,
                  };
                } else if (prevSet) {
                  targetSource = prevSet;
                } else {
                  targetSource = set;
                }
                if (targetSource) {
                  if (cat === "resistance") {
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
                    const durStr = `${dur} sec`;
                    
                    if (weight != null && weight !== 0) {
                      ghostText = `${weight} x ${durStr}`;
                    } else {
                      ghostText = durStr;
                    }
                  }
                }

                const colSpanVal = (cat === "resistance" || cat === "cardio") ? 6 : 5;

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
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              inputMode="decimal"
                              placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                              value={set.weight ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder={prevSet?.reps != null ? String(prevSet.reps) : "10"}
                              value={set.reps ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <button
                              type="button"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setRpePickerPos(
                                  rpePickerPos?.exIdx === exIdx && rpePickerPos?.setIdx === setIdx
                                    ? null
                                    : { exIdx, setIdx, top: rect.top, left: rect.left, width: rect.width }
                                );
                              }}
                              className={`h-8 w-full rounded-md text-center text-sm font-semibold transition-all border ${
                                set.rpe != null
                                  ? `${rpeColors[set.rpe as number]} text-white border-transparent`
                                  : "bg-white/5 border-border/80 text-muted-foreground hover:border-brand/40"
                              }`}
                            >
                              {set.rpe ?? "—"}
                            </button>

                            {rpePickerPos?.exIdx === exIdx && rpePickerPos?.setIdx === setIdx && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setRpePickerPos(null)} />
                                <div
                                  className="fixed z-50 flex gap-0.5 rounded-lg bg-zinc-900 border border-zinc-700 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                                  style={{
                                    top: rpePickerPos.top - 50,
                                    left: rpePickerPos.left + rpePickerPos.width / 2 - 110,
                                  }}
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        updateSet(exIdx, setIdx, "rpe", val);
                                        setRpePickerPos(null);
                                      }}
                                      className={`h-8 w-8 rounded-md text-xs font-bold text-white transition-all duration-100 active:scale-90 ${
                                        rpeColors[val]
                                      } ${set.rpe === val ? "ring-2 ring-white scale-110" : "hover:scale-110 hover:brightness-110"}`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </td>
                        </>
                      )}

                      {cat === "bodyweight" && (
                        <>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                              value={set.weight ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder={prevSet?.reps != null ? String(prevSet.reps) : "10"}
                              value={set.reps ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                        </>
                      )}

                      {cat === "cardio" && (
                        <>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder={prevSet?.distance != null ? String(prevSet.distance) : "0.0"}
                              value={set.distance ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "distance", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="text"
                              placeholder={prevSet?.duration != null ? formatSecs(prevSet.duration) : "MM:SS"}
                              value={set.duration != null ? formatSecs(set.duration) : ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "duration", parseSecs(e.target.value))}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              placeholder={prevSet?.heartRate != null ? String(prevSet.heartRate) : "140"}
                              value={set.heartRate ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "heartRate", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                        </>
                      )}

                      {cat === "isometric" && (
                        <>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                              value={set.weight ?? ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                            />
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <Input
                              type="text"
                              placeholder={prevSet?.duration != null ? formatSecs(prevSet.duration) : "MM:SS"}
                              value={set.duration != null ? formatSecs(set.duration) : ""}
                              onChange={(e) => updateSet(exIdx, setIdx, "duration", parseSecs(e.target.value))}
                              className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
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
                      const isDone = isSetAboveCompleted && !hasActiveTimer;

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
                                      {hasActiveTimer ? (
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
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <span className="text-zinc-400 font-medium">Rusttimer suggestie:</span>
                                          <button
                                            onClick={() => startRestTimer(exIdx, setIdx)}
                                            className="px-3 py-1 rounded bg-brand text-zinc-950 font-bold hover:bg-brand-hover active:scale-95 transition-all text-xs"
                                          >
                                            {ex.templateExercise?.defaultRestTime != null 
                                              ? `${formatTime(ex.templateExercise.defaultRestTime)} Start`
                                              : "90s Start"
                                            }
                                          </button>
                                          <div className="flex items-center gap-1">
                                            {[60, 120, 180].map((tVal) => (
                                              <button
                                                key={tVal}
                                                onClick={() => startRestTimer(exIdx, setIdx, tVal)}
                                                className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 hover:bg-zinc-700"
                                              >
                                                {formatTime(tVal)}
                                              </button>
                                            ))}
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
      )}

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
