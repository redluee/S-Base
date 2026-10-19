import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { clearActiveNotifications } from "@/lib/sound";
import { applySetUpdate, type SetValueField } from "@/lib/set-values";
import { fillCompletedSetDefaults, getExerciseRestTime, nextSessionSet } from "@/components/workout-session-helpers";
import type { FullWorkoutSession, SessionExercise, SessionSet } from "@backend/types/shared";

interface SetActionsArgs {
  session: FullWorkoutSession | null;
  setSession: Dispatch<SetStateAction<FullWorkoutSession | null>>;
  saveExercises: (exercises: SessionExercise[]) => Promise<void>;
  previousSetsMap: Record<string, SessionSet[]>;
  activeRestExerciseIdx: number | null;
  activeRestSetIdx: number | null;
  startRestTimer: (exIdx: number, setIdx: number, customTime?: number) => void;
  stopRestTimer: () => void;
}

export function useSessionSetActions({
  session,
  setSession,
  saveExercises,
  previousSetsMap,
  activeRestExerciseIdx,
  activeRestSetIdx,
  startRestTimer,
  stopRestTimer,
}: SetActionsArgs) {
  const touchedRef = useRef<Set<string>>(new Set());
  // Pop Burst satisfaction animation state
  const [lastCompletedSet, setLastCompletedSet] = useState<{ exIdx: number; setIdx: number } | null>(null);

  async function removeSet(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    let sets = [...(ex.sets ?? [])];
    sets = sets.filter((_, i) => i !== setIndex);
    ex.sets = sets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateSet(exerciseIndex: number, setIndex: number, field: keyof SessionSet, value: number | string | null | undefined) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const exKey = ex.sessionExerciseId ?? exerciseIndex;
    const keyFor = (i: number) => `${exKey}:${i}:${field}`;
    touchedRef.current.add(keyFor(setIndex));

    ex.sets = applySetUpdate(
      ex.sets ?? [],
      setIndex,
      field as SetValueField,
      (value ?? null) as number | null,
      (i) => touchedRef.current.has(keyFor(i))
    );
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });

    await saveExercises(exercises);
  }

  async function updateSetAndComplete(exerciseIndex: number, setIndex: number, durationSeconds: number) {
    if (!session) return;
    clearActiveNotifications();
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const exKey = ex.sessionExerciseId ?? exerciseIndex;
    const keyFor = (i: number) => `${exKey}:${i}:duration`;
    touchedRef.current.add(keyFor(setIndex));

    const sets = applySetUpdate(
      ex.sets ?? [],
      setIndex,
      "duration",
      durationSeconds,
      (i) => touchedRef.current.has(keyFor(i))
    );
    sets[setIndex] = { ...sets[setIndex], completed: 1 };
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);

    const hasNextIncompleteSet = setIndex < sets.length - 1 && sets.slice(setIndex + 1).some((s) => s.completed === 0);
    const restTime = getExerciseRestTime(ex);
    if (restTime > 0 && hasNextIncompleteSet) {
      startRestTimer(exerciseIndex, setIndex, restTime);
    } else if (activeRestExerciseIdx === exerciseIndex) {
      stopRestTimer();
    }

    setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
    setTimeout(() => setLastCompletedSet(null), 800);
  }

  async function toggleSetCompleted(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    const set = { ...sets[setIndex] };

    const nextCompleted = set.completed ? 0 : 1;
    set.completed = nextCompleted;

    if (nextCompleted === 1) {
      clearActiveNotifications();
      fillCompletedSetDefaults(ex, set, setIndex, previousSetsMap);

      const hasNextIncompleteSet = setIndex < sets.length - 1 && sets.slice(setIndex + 1).some((s) => s.completed === 0);
      const restTime = getExerciseRestTime(ex);
      if (restTime > 0 && hasNextIncompleteSet) {
        startRestTimer(exerciseIndex, setIndex, restTime);
      } else if (activeRestExerciseIdx === exerciseIndex) {
        stopRestTimer();
      }

      setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
      setTimeout(() => setLastCompletedSet(null), 800);
    } else {
      if (activeRestExerciseIdx === exerciseIndex && activeRestSetIdx === setIndex) {
        stopRestTimer();
      }
    }

    sets[setIndex] = set;
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addSet(exerciseIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    sets.push(nextSessionSet(sets));
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  return { lastCompletedSet, removeSet, updateSet, updateSetAndComplete, toggleSetCompleted, addSet };
}
