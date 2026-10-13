"use client";

import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { Plus } from "lucide-react";
import { blankExerciseDraft, draftFromSuggestion, type HistorySetInput } from "@/components/workout-session-helpers";
import type { ExerciseRowData } from "@/components/exercise-edit-block";

export interface AddExerciseControlsProps {
  showAddExercise: boolean;
  setShowAddExercise: (show: boolean) => void;
  newExerciseName: string;
  setNewExerciseName: (name: string) => void;
  addExercise: (
    name?: string,
    category?: string,
    sets?: number,
    reps?: number,
    equipment?: string,
    perSide?: boolean,
    isAssisted?: boolean,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    lastSets?: HistorySetInput[],
    defaultRestTime?: number
  ) => void;
  setUnknownExerciseDraft: (draft: ExerciseRowData | null) => void;
}

export function AddExerciseControls({
  showAddExercise,
  setShowAddExercise,
  newExerciseName,
  setNewExerciseName,
  addExercise,
  setUnknownExerciseDraft,
  buttonClassName,
}: AddExerciseControlsProps & { buttonClassName: string }) {
  return (
    showAddExercise ? (
      <div className="flex flex-col gap-3 w-full max-w-sm px-4">
        <div className="flex gap-2 w-full">
          <ExerciseAutocomplete
            value={newExerciseName}
            onChange={setNewExerciseName}
            onSelect={(name, sets, reps, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted, lastSets) => {
              if (category) {
                addExercise(name, category, sets, reps, equipment, perSide, isAssisted, defaultWeight, defaultDistance, defaultDuration, lastSets, defaultRestTime);
              } else {
                setUnknownExerciseDraft(
                  draftFromSuggestion(name, sets, reps, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted)
                );
              }
            }}
            placeholder={t("Search exercise") + "..."}
            className="flex-1 h-11 text-sm"
          />
          <Button
            variant="ghost"
            onClick={() => setShowAddExercise(false)}
            className="min-h-11 text-xs text-muted-foreground hover:bg-white/5"
          >
            {t("Cancel")}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            setUnknownExerciseDraft(blankExerciseDraft(newExerciseName));
          }}
          className="min-h-11 text-xs text-brand hover:underline font-medium text-center"
        >
          + {t("Nieuwe oefening instellen")}
        </button>
      </div>
    ) : (
      <Button
        onClick={() => setShowAddExercise(true)}
        className={buttonClassName}
      >
        <Plus className="size-4 mr-1.5" />
        {t("Add Exercise")}
      </Button>
    )
  );
}
