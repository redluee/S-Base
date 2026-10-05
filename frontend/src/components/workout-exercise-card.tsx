"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronUp, ChevronDown, MoreVertical, Edit2, History, Trash2, Trash, Timer, Plus, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { ExerciseCategorySelector } from "@/components/exercise-category-selector";
import { t } from "@/lib/lang";
import { formatNumberNl, parseDecimal, parseInteger, sanitizeDecimalInput, sanitizeIntegerInput, toInputString } from "@/lib/number-input";
import { isUntouchedDefault, type SetValueField } from "@/lib/set-values";
import { cn } from "@/lib/utils";
import { SwipeTr, useCoarsePointer, useSmViewport } from "@/components/swipe-tr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

type InputKind = "decimal" | "integer" | "time";

interface AutoSaveInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> {
  kind: InputKind;
  value: string;
  onSave: (val: string) => void;
}

function sameInputValue(kind: InputKind, a: string, b: string): boolean {
  if (kind === "decimal") return parseDecimal(a) === parseDecimal(b);
  if (kind === "integer") return parseInteger(a) === parseInteger(b);
  return a.trim() === b.trim();
}

function AutoSaveInput({ kind, value, onSave, ...props }: AutoSaveInputProps) {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (!sameInputValue(kind, localValue, value)) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (kind === "decimal") setLocalValue(sanitizeDecimalInput(raw));
    else if (kind === "integer") setLocalValue(sanitizeIntegerInput(raw));
    else setLocalValue(raw.replace(/[^0-9:]/g, "").slice(0, 8));
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode={kind === "decimal" ? "decimal" : "numeric"}
      enterKeyHint="done"
      autoComplete="off"
      value={localValue}
      onChange={handleChange}
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
  replaceExercise: (
    id: number,
    name: string,
    category?: string,
    equipment?: string,
    defaultRestTime?: number,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    perSide?: boolean,
    isAssisted?: boolean,
    lastSets?: Array<{
      setNumber: number;
      reps?: number | null;
      weight?: number | null;
      distance?: number | null;
      duration?: number | null;
      rpe?: number | null;
      heartRate?: number | null;
    }>
  ) => void;
  updateCategory: (idx: number, category: string) => Promise<void>;
  updateEquipment: (idx: number, equipment: string) => Promise<void>;
  updateIsAssisted: (idx: number, isAssisted: boolean) => Promise<void>;
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
  onStartRepTimer?: (exIdx: number, setIdx: number, targetDurationSeconds?: number | null) => void;
  onStartEditing?: (exIdx: number) => void;
  highlightZeroReps?: boolean;
  soundEnabled?: boolean;
  toggleSound?: () => void;
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
  const hasCurrentRepsSets = ex.sets?.some((s) => s.reps != null && s.reps > 0);
  const hasCurrentTimeSets = ex.sets?.some((s) => s.duration != null && s.duration > 0);

  if (hasCurrentRepsSets && !hasCurrentTimeSets) return false;
  if (hasCurrentTimeSets && !hasCurrentRepsSets) return true;

  if (ex.templateExercise?.defaultReps != null && ex.templateExercise.defaultReps > 0 && (ex.templateExercise.defaultDuration == null || ex.templateExercise.defaultDuration === 0)) {
    return false;
  }
  if (ex.templateExercise?.defaultDuration != null && ex.templateExercise.defaultDuration > 0 && (ex.templateExercise.defaultReps == null || ex.templateExercise.defaultReps === 0)) {
    return true;
  }

  const cat = normalizeCategory(ex.category);
  if (cat === "cardio") return true;

  const firstPrevSet = previousSetsMap?.[ex.exerciseName]?.[0];
  if (firstPrevSet?.reps != null && firstPrevSet.reps > 0 && (firstPrevSet.duration == null || firstPrevSet.duration === 0)) {
    return false;
  }
  if (firstPrevSet?.duration != null && firstPrevSet.duration > 0) {
    return true;
  }

  if (cat === "isometric" && !hasCurrentRepsSets && ex.templateExercise?.defaultReps == null) {
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
type ColumnKey = "weight" | "reps" | "distance" | "duration" | "heartRate";

interface SetColumn {
  key: ColumnKey;
  label: string;
  kind: InputKind;
  perSide?: boolean;
}

function getColumns(
  cat: ReturnType<typeof normalizeCategory>,
  isTimed: boolean,
  isAssisted: boolean,
  perSide: boolean,
  showWeight: boolean
): SetColumn[] {
  const repsOrTime: SetColumn = isTimed
    ? { key: "duration", label: t("Time (MM:SS)"), kind: "time", perSide }
    : { key: "reps", label: t("Reps"), kind: "integer", perSide };

  if (cat === "cardio") {
    return [
      { key: "distance", label: t("Distance (km)"), kind: "decimal" },
      { key: "duration", label: t("Time (MM:SS)"), kind: "time", perSide },
      { key: "heartRate", label: t("Avg HR (bpm)"), kind: "integer" },
    ];
  }
  if (cat === "bodyweight") {
    const weightCol: SetColumn = { key: "weight", label: isAssisted ? t("Assisted (kg)") : t("Added Weight (kg)"), kind: "decimal" };
    return showWeight ? [weightCol, repsOrTime] : [repsOrTime];
  }
  if (cat === "isometric") {
    const weightCol: SetColumn = { key: "weight", label: t("Added weight (kg)"), kind: "decimal" };
    return showWeight ? [weightCol, repsOrTime] : [repsOrTime];
  }
  return showWeight ? [{ key: "weight", label: "kg", kind: "decimal" }, repsOrTime] : [repsOrTime];
}

function formatColumnValue(
  col: SetColumn,
  cat: ReturnType<typeof normalizeCategory>,
  raw: number | null | undefined
): string {
  if (raw === null || raw === undefined) return "";
  if (col.kind === "time") return formatSecs(raw);
  if (col.kind === "decimal") return toInputString(cat === "bodyweight" && col.key === "weight" ? Math.abs(raw) : raw);
  return String(raw);
}

export function describeTarget(
  cat: ReturnType<typeof normalizeCategory>,
  isTimed: boolean,
  target: Partial<SessionSet> | null
): string {
  if (!target) return "—";
  const kg = (w: number) => `${formatNumberNl(w)} kg`;
  const signed = (w: number) => `${w > 0 ? "+" : ""}${formatNumberNl(w)} kg`;
  const hasTimeTarget =
    target.duration != null && target.duration > 0 && (target.reps == null || target.reps === 0 || isTimed);

  if (hasTimeTarget) {
    const durStr = formatSecs(target.duration) || `${target.duration}s`;
    if (target.weight != null && target.weight !== 0) {
      return `${cat === "bodyweight" ? signed(target.weight) : kg(target.weight)} x ${durStr}`;
    }
    if (target.distance != null && target.distance > 0) return `${formatNumberNl(target.distance)} km x ${durStr}`;
    return durStr;
  }
  if (cat === "resistance") {
    return `${target.reps ?? 10} x ${kg(target.weight ?? 0)}`;
  }
  if (cat === "bodyweight") {
    const reps = target.reps ?? 10;
    if (target.weight != null && target.weight !== 0) return `${signed(target.weight)} x ${reps}`;
    return `${reps} ${t("reps")}`;
  }
  if (cat === "cardio") {
    return `${formatNumberNl(target.distance ?? 0)} km x ${formatSecs(target.duration ?? 0) || "0:00"}`;
  }
  const reps = target.reps ?? 10;
  if (target.weight != null && target.weight !== 0) return `${reps} x ${kg(target.weight)}`;
  return `${reps} ${t("reps")}`;
}

const actionButton =
  "min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const menuItem =
  "flex w-full min-h-11 items-center px-4 text-sm text-zinc-300 data-[highlighted]:bg-zinc-800 outline-none text-left cursor-pointer";
const chipButton =
  "min-h-11 min-w-11 px-3 inline-flex items-center justify-center rounded-md bg-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

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
  updateIsAssisted,
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
  onStartRepTimer,
  onStartEditing,
  highlightZeroReps,
  soundEnabled,
  toggleSound,
}: WorkoutExerciseCardProps) {
  const allSetsDone = ex.sets?.length > 0 && ex.sets.every((s: SessionSet) => s.completed === 1);
  const cat = normalizeCategory(ex.category);
  const menuOpen = activeMenuExerciseId === ex.sessionExerciseId;
  const coarse = useCoarsePointer();
  const smViewport = useSmViewport();
  const [openSetIdx, setOpenSetIdx] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function saveColumn(col: SetColumn, setIdx: number, val: string) {
    if (col.kind === "time") {
      updateSet(exIdx, setIdx, "duration", parseSecs(val));
      return;
    }
    if (col.kind === "integer") {
      const n = parseInteger(val);
      updateSet(exIdx, setIdx, col.key as keyof SessionSet, n === null ? null : Math.max(0, n));
      return;
    }
    const n = parseDecimal(val);
    if (col.key === "weight" && cat === "bodyweight") {
      const mag = n === null ? null : Math.abs(n);
      updateSet(exIdx, setIdx, "weight", mag === null ? null : ex.isAssisted ? -mag : mag);
      return;
    }
    updateSet(exIdx, setIdx, col.key as keyof SessionSet, n === null ? null : Math.max(0, n));
  }

  return (
    <div
      id={`session-exercise-${ex.sessionExerciseId ?? exIdx}`}
      data-ex-id={ex.sessionExerciseId ?? exIdx}
      className={cn(
        "scroll-mt-24 rounded-xl bg-card/60 border p-4 sm:p-5 relative transition-colors duration-300 max-[375px]:border-0 max-[375px]:rounded-none max-[375px]:bg-transparent",
        allSetsDone ? "border-brand/60 ring-1 ring-brand/30" : "border-border"
      )}
    >
      {/* Exercise Card Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          {replacingExerciseId === ex.sessionExerciseId ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 items-center w-full">
                <div className="flex-1 min-w-0">
                  <ExerciseAutocomplete
                    value={replaceName}
                    onChange={setReplaceName}
                    onSelect={(v, sets, reps, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted, lastSets) => {
                      replaceExercise(ex.sessionExerciseId!, v, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted, lastSets);
                    }}
                    placeholder={t("Search exercise") + "..."}
                    className="w-full h-11 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReplacingExerciseId(null);
                    setReplaceName("");
                  }}
                  className="min-h-11 text-xs text-muted-foreground hover:bg-white/5"
                >
                  {t("Cancel")}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (replaceName.trim()) {
                    replaceExercise(ex.sessionExerciseId!, replaceName.trim(), undefined);
                  }
                }}
                className="min-h-11 text-xs text-brand hover:underline font-medium text-left self-start cursor-pointer"
              >
                + {t("Nieuwe oefening instellen")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-foreground text-base sm:text-lg flex items-center gap-2 min-h-11 break-words">
                <span className="min-w-0">{exIdx + 1}. {ex.exerciseName}</span>
                {allSetsDone && (
                  <span
                    role="img"
                    aria-label={t("Alle sets voltooid")}
                    className="inline-flex items-center justify-center size-5 rounded-full bg-brand/20 text-brand animate-scale-in shrink-0"
                  >
                    <Check className="size-3 stroke-[3px]" />
                  </span>
                )}
              </h3>
            </div>
          )}
        </div>

        {/* Reordering Controls and Kebab Menu */}
        <div className="flex items-center shrink-0">
          {totalExercises > 1 && (
            <>
              <button
                type="button"
                disabled={exIdx === 0}
                onClick={() => moveExerciseUpDirect(exIdx)}
                className={actionButton}
                title={t("Move Up")}
                aria-label={t("Move Up")}
              >
                <ChevronUp className="size-5" />
              </button>
              <button
                type="button"
                disabled={exIdx === totalExercises - 1}
                onClick={() => moveExerciseDownDirect(exIdx)}
                className={actionButton}
                title={t("Move Down")}
                aria-label={t("Move Down")}
              >
                <ChevronDown className="size-5" />
              </button>
            </>
          )}

          <Menu.Root
            open={menuOpen}
            onOpenChange={(open) => setActiveMenuExerciseId(open ? (ex.sessionExerciseId ?? null) : null)}
          >
            <Menu.Trigger
              aria-label={t("Meer opties")}
              className={cn(actionButton, "hover:text-foreground data-[popup-open]:bg-white/10")}
            >
              <MoreVertical className="size-5" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" sideOffset={4} className="z-50">
                <Menu.Popup className="w-52 max-w-[calc(100vw-2rem)] rounded-lg bg-zinc-900 border border-zinc-800 py-1 text-sm outline-none">
                  {onStartEditing && (
                    <Menu.Item className={menuItem} onClick={() => onStartEditing(exIdx)}>
                      <Edit2 className="size-4 mr-2 text-zinc-500" />
                      {t("Edit Exercise")}
                    </Menu.Item>
                  )}
                  <Menu.Item
                    className={menuItem}
                    onClick={() => {
                      setReplacingExerciseId(ex.sessionExerciseId!);
                      setReplaceName("");
                    }}
                  >
                    <RefreshCw className="size-4 mr-2 text-zinc-500" />
                    {t("Replace Exercise")}
                  </Menu.Item>
                  <Menu.Item className={menuItem} onClick={() => setHistoryExerciseName(ex.exerciseName, ex.equipment)}>
                    <History className="size-4 mr-2 text-zinc-500" />
                    {t("View History")}
                  </Menu.Item>
                  <hr className="border-zinc-800 my-1" />
                  <Menu.Item
                    className={cn(menuItem, "text-destructive")}
                    onClick={() => setConfirmRemove(true)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    {t("Remove")}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>

      {replacingExerciseId !== ex.sessionExerciseId && (
        <div className="mb-4">
          <ExerciseCategorySelector
            category={ex.category ?? "Free Weights"}
            equipment={ex.equipment ?? ""}
            readOnlyCategory={true}
            onChange={(cat, eq) => {
              if (cat !== ex.category) {
                updateCategory(exIdx, cat);
              }
              updateEquipment(exIdx, eq);
            }}
            isAssisted={Boolean(ex.isAssisted)}
            onToggleAssisted={(val) => updateIsAssisted(exIdx, val)}
          />
        </div>
      )}

      {/* Sets Table */}
      {ex.sets?.length > 0 && (() => {
        const isTimed = isTimedExercise(ex, previousSetsMap);
        const perSide = ex.perSide != null ? Boolean(ex.perSide) : Boolean(ex.templateExercise?.perSide);
        const equipmentList = ex.equipment ? ex.equipment.split(",").map((e) => e.trim()).filter((e) => e && e !== "none") : [];
        const bodyweightOnly = equipmentList.length > 0 && equipmentList.every((e) => e === "Bodyweight");
        const hasWeightEquipment = equipmentList.some((e) => e !== "Bodyweight") || (cat === "resistance" && !bodyweightOnly);
        const hasWeightData =
          (ex.sets ?? []).some((s: SessionSet) => s.weight != null && (s.weight !== 0 || cat === "resistance")) ||
          (previousSetsMap[ex.exerciseName] ?? []).some((s: SessionSet) => s.weight != null && s.weight !== 0);
        const showWeight = hasWeightEquipment || Boolean(ex.isAssisted) || hasWeightData;
        const columns = getColumns(cat, isTimed, Boolean(ex.isAssisted), perSide, showWeight);
        const canDeleteSets = ex.sets.length > 1;
        const totalCols = 1 + (smViewport ? 1 : 0) + columns.length + 1 + (canDeleteSets ? 1 : 0);
        const swipeMode = coarse && canDeleteSets;

        return (
          <div
            data-swipe-clip
            className={cn("-mx-4 sm:mx-0 mb-4 max-[375px]:bg-card/60", swipeMode && "relative overflow-hidden")}
          >
            <table
              className="table-fixed text-xs sm:text-sm border-collapse"
              style={{ width: swipeMode ? "calc(100% + 2.75rem)" : "100%" }}
            >
              <colgroup>
                <col className="w-7 sm:w-10" />
                <col className="hidden sm:table-column sm:w-[26%]" />
                {columns.map((col) => (
                  <col key={col.key} className={col.kind === "time" && onStartRepTimer ? "w-[6.25rem] sm:w-40" : undefined} />
                ))}
                <col className="w-11" />
                {canDeleteSets && <col className="w-11" />}
              </colgroup>
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th scope="col" className="text-left py-2 pl-3 sm:pl-2 pr-0 font-normal">{t("Set")}</th>
                  <th scope="col" className="hidden sm:table-cell text-left py-2 px-3 font-normal">{t("Target")}</th>
                  {columns.map((col) => (
                    <th key={col.key} scope="col" className="text-center py-2 px-0.5 sm:px-2 font-normal text-[11px] sm:text-xs leading-tight align-bottom">
                      <span>{col.label}</span>
                      {col.perSide && (
                        <span className="block text-[10px] text-muted-foreground font-normal leading-tight mt-0.5">
                          ({t("per side")})
                        </span>
                      )}
                    </th>
                  ))}
                  <th scope="col" className="text-center py-2 px-0 font-normal text-[11px] sm:text-xs">{t("Done")}</th>
                  {canDeleteSets && (
                    <th scope="col" className="p-0">
                      <span className="sr-only">{t("Verwijderen")}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((set: SessionSet, setIdx: number) => {
                  const prevSets = previousSetsMap[ex.exerciseName];
                  const prevSet = prevSets?.[setIdx] ?? prevSets?.[prevSets.length - 1];

                  const hasPrevData = prevSet && (
                    prevSet.reps != null ||
                    prevSet.weight != null ||
                    prevSet.distance != null ||
                    prevSet.duration != null ||
                    prevSet.heartRate != null
                  );

                  let targetSource: Partial<SessionSet> | null = null;
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

                  const ghostText = describeTarget(cat, isTimed, targetSource);
                  const isZero = highlightZeroReps && isSetZero(ex, set, previousSetsMap);
                  const isCurrentRest = activeRestExerciseIdx === exIdx && activeRestSetIdx === setIdx;
                  const justCompleted = lastCompletedSet?.exIdx === exIdx && lastCompletedSet?.setIdx === setIdx;

                  return (
                    <React.Fragment key={setIdx}>
                      <SwipeTr
                        enabled={swipeMode && set.completed !== 1}
                        open={openSetIdx === setIdx}
                        onOpenChange={(o) => setOpenSetIdx(o ? setIdx : null)}
                        className={cn(
                          "border-b border-border/20 last:border-0",
                          set.completed ? "bg-brand/5" : "hover:bg-white/[0.01]"
                        )}
                      >
                        <td className="py-1 pl-3 sm:pl-2 pr-0 font-medium text-zinc-400 align-middle">{set.setNumber}</td>

                        <td className="hidden sm:table-cell py-1 px-3 text-muted-foreground align-middle text-xs">
                          {ghostText}
                        </td>

                        {columns.map((col) => {
                          const targetRaw = targetSource?.[col.key] as number | null | undefined;
                          const raw = set[col.key] as number | null | undefined;
                          const display = formatColumnValue(col, cat, raw);
                          const placeholder =
                            targetRaw != null
                              ? formatColumnValue(col, cat, targetRaw)
                              : col.kind === "time"
                                ? "MM:SS"
                                : col.kind === "decimal"
                                  ? "0,0"
                                  : "0";
                          const pristine = isUntouchedDefault(set, col.key as SetValueField, targetRaw ?? null);
                          const flagged = isZero && (col.key === "reps" || col.key === "duration" || col.key === "distance");
                          const input = (
                            <AutoSaveInput
                              kind={col.kind}
                              aria-label={`${col.label}, ${t("Set")} ${set.setNumber}`}
                              placeholder={placeholder}
                              value={display}
                              onSave={(val) => saveColumn(col, setIdx, val)}
                              className={cn(
                                "bg-white/5 h-11 text-center text-sm rounded-md px-1 transition-colors placeholder:text-muted-foreground/60 placeholder:italic placeholder:font-normal",
                                pristine ? "text-muted-foreground italic font-normal" : "text-foreground font-semibold",
                                flagged
                                  ? "border-red-500 focus-visible:border-red-500 bg-red-950/20 ring-1 ring-red-500/30"
                                  : "border-border/80 focus-visible:border-brand/40"
                              )}
                            />
                          );

                          return (
                            <td key={col.key} className="py-1 px-0.5 sm:px-2 align-middle">
                              {col.kind === "time" && onStartRepTimer ? (
                                <div className="flex items-center">
                                  <div className="flex-1 min-w-0">{input}</div>
                                  <button
                                    type="button"
                                    onClick={() => onStartRepTimer(exIdx, setIdx, targetSource?.duration)}
                                    className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-brand hover:bg-white/10 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                    title={t("Start Timer")}
                                    aria-label={`${t("Start Timer")}, ${t("Set")} ${set.setNumber}`}
                                  >
                                    <Timer className="size-4" />
                                  </button>
                                </div>
                              ) : (
                                input
                              )}
                            </td>
                          );
                        })}

                        <td className="p-0 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => toggleSetCompleted(exIdx, setIdx)}
                            aria-label={set.completed ? t("Markeer set als niet voltooid") : t("Mark set as completed")}
                            aria-pressed={Boolean(set.completed)}
                            className="mx-auto size-11 flex items-center justify-center group/checkbtn relative outline-none"
                          >
                            <span
                              className={cn(
                                "size-8 rounded-md flex items-center justify-center border transition-all duration-75 group-active/checkbtn:scale-90 group-focus-visible/checkbtn:ring-3 group-focus-visible/checkbtn:ring-ring/50",
                                set.completed
                                  ? "bg-brand border-brand text-zinc-900"
                                  : "bg-white/5 border-border text-zinc-500 group-hover/checkbtn:border-brand/40 group-hover/checkbtn:bg-brand/10 group-hover/checkbtn:text-brand"
                              )}
                            >
                              {set.completed ? (
                                <Check className="size-4 stroke-[3px] animate-scale-in" />
                              ) : (
                                <Check className="size-4 opacity-25 group-hover/checkbtn:opacity-100 transition-opacity" />
                              )}
                            </span>
                            {Boolean(set.completed) && justCompleted && (
                              <>
                                <span className="absolute size-1.5 rounded-full bg-brand animate-particle-1 pointer-events-none" />
                                <span className="absolute size-1.5 rounded-full bg-brand animate-particle-2 pointer-events-none" />
                                <span className="absolute size-1.5 rounded-full bg-brand animate-particle-3 pointer-events-none" />
                                <span className="absolute size-1.5 rounded-full bg-brand animate-particle-4 pointer-events-none" />
                              </>
                            )}
                          </button>
                        </td>
                        {canDeleteSets && (
                          <td className={cn("p-0 text-center align-middle", swipeMode && "bg-destructive/10")}>
                            {set.completed !== 1 && (
                              <button
                                type="button"
                                data-swipe-action
                                onClick={() => {
                                  setOpenSetIdx(null);
                                  removeSet(exIdx, setIdx);
                                }}
                                aria-label={`${t("Set verwijderen")} ${set.setNumber}`}
                                title={t("Set verwijderen")}
                                className="mx-auto size-11 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-destructive hover:bg-red-950/20 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                              >
                                <Trash className="size-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </SwipeTr>
                      {setIdx < ex.sets.length - 1 && (() => {
                        const isSetAboveCompleted = set.completed === 1;
                        const hasActiveTimer = isCurrentRest && restSecondsLeft > 0;
                        if (!hasActiveTimer || !isSetAboveCompleted) return null;

                        return (
                          <tr className="border-b border-border/10 bg-zinc-950/50">
                            <td colSpan={totalCols} className="p-0 relative overflow-hidden">
                              <div
                                className="absolute inset-0 bg-brand/10 transition-all duration-1000 ease-linear pointer-events-none"
                                style={{ width: `${restTotalSeconds > 0 ? (restSecondsLeft / restTotalSeconds) * 100 : 0}%` }}
                              />
                              <div className={cn("relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 text-xs text-zinc-400 w-full", swipeMode && "pr-14")}>
                                <Timer className={cn("size-4 shrink-0", restActive ? "text-brand animate-pulse" : "text-zinc-500")} aria-hidden="true" />
                                <span
                                  role="timer"
                                  aria-label={t("Rusttijd")}
                                  className="text-base font-bold text-brand tabular-nums min-w-12"
                                >
                                  {formatTime(restSecondsLeft)}
                                </span>
                                <div className="flex flex-wrap items-center gap-1">
                                  <button type="button" onClick={() => adjustRestTimer(15)} className={chipButton}>
                                    +15s
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustRestTimer(-15)}
                                    className={chipButton}
                                    disabled={restSecondsLeft <= 15}
                                  >
                                    -15s
                                  </button>
                                  <button
                                    type="button"
                                    onClick={stopRestTimer}
                                    className={cn(chipButton, "bg-red-950/55 border border-red-900/30 text-red-300 hover:bg-red-900/40")}
                                  >
                                    {t("Skip")}
                                  </button>
                                  {toggleSound && (
                                    <button
                                      type="button"
                                      onClick={toggleSound}
                                      title={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
                                      aria-label={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
                                      className={chipButton}
                                    >
                                      {soundEnabled ? (
                                        <Volume2 className="size-4 text-brand" />
                                      ) : (
                                        <VolumeX className="size-4 text-zinc-500" />
                                      )}
                                    </button>
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
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => addSet(exIdx)}
          className="flex-1 min-w-0 min-h-11 border border-dashed border-border/60 text-muted-foreground hover:text-foreground text-sm rounded-lg transition-colors hover:bg-white/[0.01]"
        >
          <Plus className="size-4 mr-1" />
          {t("Add Set")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={t("Remove this exercise?")}
        description={t("The exercise and all its sets are removed from this workout.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Remove")}
        tone="destructive"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          removeExercise(ex.sessionExerciseId!);
        }}
      />
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
