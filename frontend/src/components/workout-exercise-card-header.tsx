"use client";

import { Check, ChevronUp, ChevronDown, MoreVertical, Edit2, History, Trash2, RefreshCw } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Button } from "@/components/ui/button";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import type { WorkoutExerciseCardProps } from "@/components/workout-exercise-card";

const actionButton =
  "min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const menuItem =
  "flex w-full min-h-11 items-center px-4 text-sm text-zinc-300 data-[highlighted]:bg-zinc-800 outline-none text-left cursor-pointer";

type HeaderProps = Pick<
  WorkoutExerciseCardProps,
  | "ex"
  | "exIdx"
  | "totalExercises"
  | "replacingExerciseId"
  | "setReplacingExerciseId"
  | "replaceName"
  | "setReplaceName"
  | "replaceExercise"
  | "moveExerciseUpDirect"
  | "moveExerciseDownDirect"
  | "activeMenuExerciseId"
  | "setActiveMenuExerciseId"
  | "setHistoryExerciseName"
  | "onStartEditing"
> & {
  allSetsDone: boolean;
  onRequestRemove: () => void;
};

export function ExerciseCardHeader({
  ex,
  exIdx,
  totalExercises,
  replacingExerciseId,
  setReplacingExerciseId,
  replaceName,
  setReplaceName,
  replaceExercise,
  moveExerciseUpDirect,
  moveExerciseDownDirect,
  activeMenuExerciseId,
  setActiveMenuExerciseId,
  setHistoryExerciseName,
  onStartEditing,
  allSetsDone,
  onRequestRemove,
}: HeaderProps) {
  const menuOpen = activeMenuExerciseId === ex.sessionExerciseId;

  return (
    <>
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
                      onClick={() => onRequestRemove()}
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

    </>
  );
}
