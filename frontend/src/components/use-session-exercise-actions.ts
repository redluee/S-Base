import { useState, type Dispatch, type SetStateAction } from "react";
import { createTempExerciseId, setExerciseAssisted } from "@/lib/offline-workout";
import type { ExerciseRowData } from "@/components/exercise-edit-block";
import {
  buildEditDraft,
  defaultSetList,
  draftFromSuggestion,
  fetchLastCompletedSets,
  parseDraftValues,
  parseDurationHelper,
  scrollToSessionExercise,
  setsFromHistory,
  type HistorySetInput,
} from "@/components/workout-session-helpers";
import type { FullWorkoutSession, SessionExercise, SessionSet } from "@backend/types/shared";

interface ExerciseActionsArgs {
  session: FullWorkoutSession | null;
  setSession: Dispatch<SetStateAction<FullWorkoutSession | null>>;
  saveExercises: (exercises: SessionExercise[]) => Promise<void>;
  setPreviousSetsMap: Dispatch<SetStateAction<Record<string, SessionSet[]>>>;
}

export function useSessionExerciseActions({ session, setSession, saveExercises, setPreviousSetsMap }: ExerciseActionsArgs) {
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [unknownExerciseDraft, setUnknownExerciseDraft] = useState<ExerciseRowData | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<number | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [editingExerciseDraft, setEditingExerciseDraft] = useState<ExerciseRowData | null>(null);

  async function updateCategory(exerciseIndex: number, category: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const targetEx = exercises[exerciseIndex];
    if (!targetEx) return;

    exercises[exerciseIndex] = { ...targetEx, category };
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateEquipment(exerciseIndex: number, equipment: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], equipment };
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateIsAssisted(exerciseIndex: number, isAssisted: boolean) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    exercises[exerciseIndex] = setExerciseAssisted(exercises[exerciseIndex], isAssisted);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addExercise(
    nameOverride?: string,
    categoryOverride?: string,
    defaultSets?: number,
    defaultReps?: number,
    equipmentOverride?: string,
    perSideOverride?: boolean,
    isAssistedOverride?: boolean,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    lastSets?: HistorySetInput[],
    defaultRestTime?: number
  ) {
    const name = nameOverride || newExerciseName.trim();
    if (!session || !name) return;
    const exercises = [...(session.exercises ?? [])];
    const cat = categoryOverride || "resistance";
    const eq = equipmentOverride || (cat === "resistance" ? "dumbbell" : "none");

    let historySessionSets: SessionSet[] | null = (lastSets as unknown as SessionSet[]) || null;

    if (!historySessionSets || historySessionSets.length === 0) {
      try {
        const found = await fetchLastCompletedSets(name);
        if (found) historySessionSets = found.lastSession.sets as unknown as SessionSet[];
      } catch (err) {
        console.error("Failed to load progress for added exercise", err);
      }
    }

    if (historySessionSets && historySessionSets.length > 0) {
      setPreviousSetsMap((prev) => ({
        ...prev,
        [name]: historySessionSets!,
      }));
    }

    const initialSets: SessionSet[] =
      historySessionSets && historySessionSets.length > 0
        ? setsFromHistory(historySessionSets)
        : defaultSetList(defaultSets || 3, defaultReps ?? 10, defaultWeight, defaultDistance, defaultDuration);

    exercises.push({
      sessionExerciseId: createTempExerciseId(),
      exerciseName: name,
      sortOrder: exercises.length,
      category: cat,
      equipment: eq,
      perSide: perSideOverride ? 1 : 0,
      isAssisted: isAssistedOverride ? 1 : 0,
      restTime: defaultRestTime ?? null,
      sets: initialSets,
    });

    setNewExerciseName("");
    setShowAddExercise(false);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addExerciseFromDraft(draft: ExerciseRowData) {
    if (!session || !draft.name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const { cat, eq, numSets, numReps, durationSecs, weightVal, distVal } = parseDraftValues(draft);

    const initialSets = [];
    for (let i = 1; i <= numSets; i++) {
      initialSets.push({
        setNumber: i,
        reps: numReps,
        weight: weightVal,
        editedFields: "reps,weight,distance,duration",
        distance: distVal,
        duration: durationSecs,
        rpe: null,
        heartRate: null,
        completed: 0,
      });
    }

    exercises.push({
      sessionExerciseId: createTempExerciseId(),
      exerciseName: draft.name.trim(),
      sortOrder: exercises.length,
      category: cat,
      equipment: eq,
      perSide: draft.perSide ? 1 : 0,
      isAssisted: draft.isAssisted ? 1 : 0,
      restTime: parseDurationHelper(draft.defaultRestTime) ?? 90,
      sets: initialSets,
    });

    setUnknownExerciseDraft(null);
    setNewExerciseName("");
    setShowAddExercise(false);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function removeExercise(id: number) {
    if (!session || id == null) return;
    const exercises = (session.exercises ?? []).filter((ex) => ex.sessionExerciseId !== id);
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);
  }

  async function replaceExercise(
    exerciseId: number,
    name: string,
    category?: string,
    equipment?: string,
    defaultRestTime?: number,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    perSide?: boolean,
    isAssisted?: boolean,
    lastSets?: HistorySetInput[]
  ) {
    if (!session || !name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const idx = exercises.findIndex((ex) => ex.sessionExerciseId === exerciseId);
    if (idx === -1) return;

    const trimmedName = name.trim();

    // Check if this exercise is known (category passed or found in history/progress)
    let isKnown = Boolean(category);
    let historySessionSets: SessionSet[] | null = (lastSets as unknown as SessionSet[]) || null;
    let historyCategory: string | undefined = undefined;
    let historyEquipment: string | undefined = undefined;

    // Try fetching progress/history for this exercise name if not already provided
    if (!historySessionSets || historySessionSets.length === 0) {
      try {
        const found = await fetchLastCompletedSets(trimmedName);
        if (found) {
          isKnown = true;
          historySessionSets = found.lastSession.sets as unknown as SessionSet[];
          if ((found.res as { category?: string }).category) {
            historyCategory = (found.res as { category?: string }).category;
          }
          if (found.lastSession.equipment) {
            historyEquipment = found.lastSession.equipment;
          }
        }
      } catch (err) {
        console.error("Failed to fetch progress during exercise replacement", err);
      }
    }

    if (historySessionSets && historySessionSets.length > 0) {
      // Update previousSetsMap so ghost targets show up instantly
      setPreviousSetsMap((prev) => ({
        ...prev,
        [trimmedName]: historySessionSets!,
      }));
    }

    // If exercise is NOT known (does not exist yet in system):
    if (!isKnown) {
      setReplacingExerciseId(null);
      setReplaceName("");
      // Show the exercise creation block (ExerciseEditBlock) for this exercise index
      setEditingExerciseDraft(
        draftFromSuggestion(
          trimmedName,
          undefined,
          undefined,
          equipment,
          defaultRestTime,
          defaultWeight,
          defaultDistance,
          defaultDuration,
          perSide,
          isAssisted
        )
      );
      setEditingExerciseIdx(idx);
      return;
    }

    // Exercise IS known: take over settings from last time executed or default template settings
    const cat = category || historyCategory || "resistance";
    const eq = equipment || historyEquipment || "none";
    const isPerSide = perSide ? 1 : 0;

    // Take over settings from last executed session, else construct sets using default values
    const initialSets: SessionSet[] =
      historySessionSets && historySessionSets.length > 0
        ? setsFromHistory(historySessionSets)
        : defaultSetList(3, 10, defaultWeight, defaultDistance, defaultDuration);

    exercises[idx] = {
      ...exercises[idx],
      exerciseName: trimmedName,
      category: cat,
      equipment: eq,
      perSide: isPerSide,
      isAssisted: isAssisted ? 1 : 0,
      restTime: defaultRestTime ?? null,
      templateExercise: null,
      sets: initialSets,
    };

    setReplacingExerciseId(null);
    setReplaceName("");
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  function startEditingExercise(exIdx: number) {
    if (!session?.exercises?.[exIdx]) return;
    setEditingExerciseDraft(buildEditDraft(session.exercises[exIdx]));
    setEditingExerciseIdx(exIdx);
  }

  async function saveEditedExercise(exIdx: number, draft: ExerciseRowData) {
    if (!session || !draft.name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const targetEx = exercises[exIdx];
    if (!targetEx) return;

    const { cat, eq, numSets, numReps, durationSecs, hasWeightInput, weightVal, distVal } = parseDraftValues(draft);

    const isSameExercise = targetEx.exerciseName === draft.name.trim();
    const existingSets = isSameExercise ? (targetEx.sets ?? []) : [];
    const updatedSets: SessionSet[] = [];

    for (let i = 0; i < numSets; i++) {
      const setNum = i + 1;
      const existing = existingSets[i];
      if (existing) {
        updatedSets.push({
          ...existing,
          setNumber: setNum,
          editedFields: "reps,weight,distance,duration",
          reps: draft.trackingFields.reps ? (existing.reps ?? numReps) : null,
          weight: draft.trackingFields.weight ? (hasWeightInput ? weightVal : (draft.weight?.trim() === "" ? null : existing.weight)) : null,
          duration: draft.trackingFields.time ? (existing.duration ?? durationSecs) : null,
          distance: draft.trackingFields.distance ? (existing.distance ?? distVal) : null,
        });
      } else {
        updatedSets.push({
          setNumber: setNum,
          editedFields: "reps,weight,distance,duration",
          reps: draft.trackingFields.reps ? (numReps ?? 10) : null,
          weight: draft.trackingFields.weight ? weightVal : null,
          distance: draft.trackingFields.distance ? distVal : null,
          duration: draft.trackingFields.time ? durationSecs : null,
          rpe: null,
          heartRate: null,
          completed: 0,
        });
      }
    }

    const defaultRestTimeSecs = parseDurationHelper(draft.defaultRestTime) ?? 90;

    exercises[exIdx] = {
      ...targetEx,
      exerciseName: draft.name.trim(),
      category: cat,
      equipment: eq,
      perSide: draft.perSide ? 1 : 0,
      isAssisted: draft.isAssisted ? 1 : 0,
      restTime: defaultRestTimeSecs,
      sets: updatedSets,
      templateExercise: {
        ...(targetEx.templateExercise ?? {}),
        defaultReps: draft.trackingFields.reps ? (numReps ?? 10) : null,
        defaultDuration: draft.trackingFields.time ? durationSecs : null,
        defaultWeight: draft.trackingFields.weight ? weightVal : null,
        defaultDistance: draft.trackingFields.distance ? distVal : null,
        defaultRestTime: defaultRestTimeSecs,
        perSide: draft.perSide ? 1 : 0,
        isAssisted: draft.isAssisted ? 1 : 0,
      },
    };

    setEditingExerciseIdx(null);
    setEditingExerciseDraft(null);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function moveExerciseUpDirect(idx: number) {
    if (idx === 0) return;
    swapExercises(idx, idx - 1);
  }

  async function moveExerciseDownDirect(idx: number) {
    if (!session || idx === (session.exercises?.length ?? 0) - 1) return;
    swapExercises(idx, idx + 1);
  }

  async function swapExercises(from: number, to: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const movedItem = exercises[from];
    const movedId = movedItem?.sessionExerciseId ?? to;
    const temp = exercises[from];
    exercises[from] = exercises[to];
    exercises[to] = temp;
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);

    scrollToSessionExercise(movedId);
  }

  return {
    newExerciseName,
    setNewExerciseName,
    showAddExercise,
    setShowAddExercise,
    unknownExerciseDraft,
    setUnknownExerciseDraft,
    replacingExerciseId,
    setReplacingExerciseId,
    replaceName,
    setReplaceName,
    editingExerciseIdx,
    setEditingExerciseIdx,
    editingExerciseDraft,
    setEditingExerciseDraft,
    updateCategory,
    updateEquipment,
    updateIsAssisted,
    addExercise,
    addExerciseFromDraft,
    removeExercise,
    replaceExercise,
    startEditingExercise,
    saveEditedExercise,
    moveExerciseUpDirect,
    moveExerciseDownDirect,
  };
}
