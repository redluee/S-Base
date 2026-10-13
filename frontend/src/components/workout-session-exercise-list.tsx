"use client";

import { t } from "@/lib/lang";
import { ExerciseEditBlock, type ExerciseRowData } from "@/components/exercise-edit-block";
import { WorkoutExerciseCard, type WorkoutExerciseCardProps } from "@/components/workout-exercise-card";
import { AddExerciseControls, type AddExerciseControlsProps } from "@/components/workout-session-add-exercise";
import { Dumbbell } from "lucide-react";
import type { SessionExercise } from "@backend/types/shared";

interface WorkoutSessionExerciseListProps {
  exercises: SessionExercise[];
  cardProps: Omit<WorkoutExerciseCardProps, "ex" | "exIdx" | "totalExercises">;
  addControls: AddExerciseControlsProps;
  unknownExerciseDraft: ExerciseRowData | null;
  setUnknownExerciseDraft: (updater: ((prev: ExerciseRowData | null) => ExerciseRowData | null) | ExerciseRowData | null) => void;
  addExerciseFromDraft: (draft: ExerciseRowData) => void;
  editingExerciseIdx: number | null;
  editingExerciseDraft: ExerciseRowData | null;
  setEditingExerciseIdx: (idx: number | null) => void;
  setEditingExerciseDraft: (updater: ((prev: ExerciseRowData | null) => ExerciseRowData | null) | ExerciseRowData | null) => void;
  saveEditedExercise: (exIdx: number, draft: ExerciseRowData) => void;
}

export function WorkoutSessionExerciseList({
  exercises,
  cardProps,
  addControls,
  unknownExerciseDraft,
  setUnknownExerciseDraft,
  addExerciseFromDraft,
  editingExerciseIdx,
  editingExerciseDraft,
  setEditingExerciseIdx,
  setEditingExerciseDraft,
  saveEditedExercise,
}: WorkoutSessionExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
        {unknownExerciseDraft ? (
          <div className="flex-1 flex flex-col gap-6 px-1 sm:px-0">
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="text-sm font-medium text-muted-foreground">{t("Add New Exercise")}</h2>
            </div>
            <ExerciseEditBlock
              exercise={unknownExerciseDraft}
              index={0}
              onChange={(fields) => setUnknownExerciseDraft((prev) => prev ? { ...prev, ...fields } : null)}
              onSave={() => addExerciseFromDraft(unknownExerciseDraft)}
              onCancel={() => setUnknownExerciseDraft(null)}
              saveButtonLabel={t("Voeg toe aan training")}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <Dumbbell className="size-12 text-zinc-600 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("No exercises yet. Add one to start.")}
            </p>
            <AddExerciseControls
              {...addControls}
              buttonClassName="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold min-h-11"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("Exercises")}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
          {exercises.length} {exercises.length === 1 ? t("exercise") : t("exercises")}
        </span>
      </div>
      {exercises.map((ex: SessionExercise, exIdx: number) => {
        if (editingExerciseIdx === exIdx && editingExerciseDraft) {
          return (
            <div key={ex.sessionExerciseId ?? exIdx} className="mb-4">
              <ExerciseEditBlock
                exercise={editingExerciseDraft}
                index={exIdx}
                onChange={(fields) =>
                  setEditingExerciseDraft((prev) => (prev ? { ...prev, ...fields } : null))
                }
                onSave={() => saveEditedExercise(exIdx, editingExerciseDraft)}
                onCancel={() => {
                  setEditingExerciseIdx(null);
                  setEditingExerciseDraft(null);
                }}
                saveButtonLabel={t("Wijzigingen Opslaan")}
              />
            </div>
          );
        }

        return (
          <WorkoutExerciseCard
        key={ex.sessionExerciseId ?? exIdx}
        ex={ex}
        exIdx={exIdx}
        totalExercises={exercises.length}
        {...cardProps}
      />
        );
      })}


      {/* Underneath other exercises: render ExerciseEditBlock if unknownExerciseDraft exists */}
      {unknownExerciseDraft ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">{t("Add New Exercise")}</h3>
          </div>
          <ExerciseEditBlock
            exercise={unknownExerciseDraft}
            index={exercises.length}
            onChange={(fields) => setUnknownExerciseDraft((prev) => prev ? { ...prev, ...fields } : null)}
            onSave={() => addExerciseFromDraft(unknownExerciseDraft)}
            onCancel={() => setUnknownExerciseDraft(null)}
            saveButtonLabel={t("Voeg toe aan training")}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center">
          <AddExerciseControls
            {...addControls}
            buttonClassName="bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand font-semibold w-full sm:w-64 min-h-11"
          />
        </div>
      )}
    </div>
  );
}
