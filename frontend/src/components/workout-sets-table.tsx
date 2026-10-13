"use client";

import React, { useState } from "react";
import { Check, Trash, Timer } from "lucide-react";
import { t } from "@/lib/lang";
import { parseDecimal, parseInteger } from "@/lib/number-input";
import { isUntouchedDefault, type SetValueField } from "@/lib/set-values";
import { cn } from "@/lib/utils";
import { SwipeTr, useCoarsePointer, useSmViewport } from "@/components/swipe-tr";
import { AutoSaveInput } from "@/components/workout-auto-save-input";
import { RestTimerRow } from "@/components/workout-rest-timer-row";
import {
  describeTarget,
  formatColumnValue,
  getColumns,
  isSetZero,
  isTimedExercise,
  normalizeCategory,
  parseSecs,
  type SetColumn,
} from "@/components/workout-exercise-card-utils";
import type { WorkoutExerciseCardProps } from "@/components/workout-exercise-card";
import type { SessionSet } from "@backend/types/shared";

type SetsTableProps = Pick<
  WorkoutExerciseCardProps,
  | "ex"
  | "exIdx"
  | "previousSetsMap"
  | "updateSet"
  | "toggleSetCompleted"
  | "removeSet"
  | "activeRestExerciseIdx"
  | "activeRestSetIdx"
  | "restSecondsLeft"
  | "restTotalSeconds"
  | "restActive"
  | "lastCompletedSet"
  | "stopRestTimer"
  | "adjustRestTimer"
  | "onStartRepTimer"
  | "highlightZeroReps"
  | "soundEnabled"
  | "toggleSound"
>;

export function SetsTable({
  ex,
  exIdx,
  previousSetsMap,
  updateSet,
  toggleSetCompleted,
  removeSet,
  activeRestExerciseIdx,
  activeRestSetIdx,
  restSecondsLeft,
  restTotalSeconds,
  restActive,
  lastCompletedSet,
  stopRestTimer,
  adjustRestTimer,
  onStartRepTimer,
  highlightZeroReps,
  soundEnabled,
  toggleSound,
}: SetsTableProps) {
  const cat = normalizeCategory(ex.category);
  const coarse = useCoarsePointer();
  const smViewport = useSmViewport();
  const [openSetIdx, setOpenSetIdx] = useState<number | null>(null);

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
  const hasFlexibleColumn = columns.some((col) => !(col.kind === "time" && onStartRepTimer));
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
              <col key={col.key} className={col.kind === "time" && onStartRepTimer && hasFlexibleColumn ? "w-[6.25rem] sm:w-40" : undefined} />
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
                  {setIdx < ex.sets.length - 1 && set.completed === 1 && isCurrentRest && restSecondsLeft > 0 && (
                  <RestTimerRow
                    totalCols={totalCols}
                    swipeMode={swipeMode}
                    restSecondsLeft={restSecondsLeft}
                    restTotalSeconds={restTotalSeconds}
                    restActive={restActive}
                    adjustRestTimer={adjustRestTimer}
                    stopRestTimer={stopRestTimer}
                    soundEnabled={soundEnabled}
                    toggleSound={toggleSound}
                  />
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );

}
