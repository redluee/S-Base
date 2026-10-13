"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseCategorySelector } from "@/components/exercise-category-selector";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { ExerciseCardHeader } from "@/components/workout-exercise-card-header";
import { SetsTable } from "@/components/workout-sets-table";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

export { normalizeCategory, isTimedExercise, isSetZero, describeTarget } from "@/components/workout-exercise-card-utils";

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
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div
      id={`session-exercise-${ex.sessionExerciseId ?? exIdx}`}
      data-ex-id={ex.sessionExerciseId ?? exIdx}
      className={cn(
        "scroll-mt-24 rounded-xl bg-card/60 border p-4 sm:p-5 relative transition-colors duration-300 max-[375px]:border-0 max-[375px]:rounded-none max-[375px]:bg-transparent",
        allSetsDone ? "border-brand/60 ring-1 ring-brand/30" : "border-border"
      )}
    >
      <ExerciseCardHeader
        ex={ex}
        exIdx={exIdx}
        totalExercises={totalExercises}
        replacingExerciseId={replacingExerciseId}
        setReplacingExerciseId={setReplacingExerciseId}
        replaceName={replaceName}
        setReplaceName={setReplaceName}
        replaceExercise={replaceExercise}
        moveExerciseUpDirect={moveExerciseUpDirect}
        moveExerciseDownDirect={moveExerciseDownDirect}
        activeMenuExerciseId={activeMenuExerciseId}
        setActiveMenuExerciseId={setActiveMenuExerciseId}
        setHistoryExerciseName={setHistoryExerciseName}
        onStartEditing={onStartEditing}
        allSetsDone={allSetsDone}
        onRequestRemove={() => setConfirmRemove(true)}
      />

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

      {ex.sets?.length > 0 && (
        <SetsTable
          ex={ex}
          exIdx={exIdx}
          previousSetsMap={previousSetsMap}
          updateSet={updateSet}
          toggleSetCompleted={toggleSetCompleted}
          removeSet={removeSet}
          activeRestExerciseIdx={activeRestExerciseIdx}
          activeRestSetIdx={activeRestSetIdx}
          restSecondsLeft={restSecondsLeft}
          restTotalSeconds={restTotalSeconds}
          restActive={restActive}
          lastCompletedSet={lastCompletedSet}
          stopRestTimer={stopRestTimer}
          adjustRestTimer={adjustRestTimer}
          onStartRepTimer={onStartRepTimer}
          highlightZeroReps={highlightZeroReps}
          soundEnabled={soundEnabled}
          toggleSound={toggleSound}
        />
      )}

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
