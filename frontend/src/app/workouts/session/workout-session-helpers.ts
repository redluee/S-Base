import { DEFAULT_CATEGORY, DEFAULT_REPS, DEFAULT_REST_SECONDS, DEFAULT_SETS, highestCompletedWeight, normalizeCategory, normalizeEquipment, trackingKind, effectiveVolume } from "@backend/shared/workout";
import { api } from "@/lib/api";
import { parseDecimal, toInputString } from "@/app/workouts/number-input";
import { isTimedExercise } from "@/app/workouts/session/workout-exercise-card";
import { type ExerciseRowData } from "@/app/workouts/(main)/exercises/exercise-edit-block";
import type { FullWorkoutSession, SessionExercise, SessionSet } from "@backend/types/shared";
import { formatClockInput, parseClock } from "@/app/workouts/duration";

export type HistorySetInput = {
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  rpe?: number | null;
  heartRate?: number | null;
};



export function getExerciseRestTime(ex: SessionExercise): number {
  return ex.restTime ?? ex.templateExercise?.defaultRestTime ?? DEFAULT_REST_SECONDS;
}

export function calculateTotalVolume(session: FullWorkoutSession | null): number {
  let vol = 0;
  if (session?.exercises) {
    for (const ex of session.exercises) {
      if (ex.sets) {
        for (const s of ex.sets) {
          if (s.completed === 1 && s.weight && s.reps) {
            vol += effectiveVolume(s.weight, s.reps);
          }
        }
      }
    }
  }
  return vol;
}

export function setsFromHistory(history: SessionSet[]): SessionSet[] {
  return history.filter((s) => s.completed !== 0).map((s, i) => ({
    setNumber: i + 1,
    reps: s.reps ?? null,
    weight: highestCompletedWeight(history),
    editedFields: "",
    distance: s.distance ?? null,
    duration: s.duration ?? null,
    rpe: s.rpe ?? null,
    heartRate: s.heartRate ?? null,
    completed: 0,
  }));
}

export function defaultSetList(
  numSets: number,
  numReps: number,
  defaultWeight?: number,
  defaultDistance?: number,
  defaultDuration?: number
): SessionSet[] {
  const sets: SessionSet[] = [];
  for (let i = 1; i <= numSets; i++) {
    sets.push({
      setNumber: i,
      reps: numReps,
      weight: defaultWeight ?? null,
      editedFields: "",
      distance: defaultDistance ?? null,
      duration: defaultDuration ?? null,
      rpe: null,
      heartRate: null,
      completed: 0,
    });
  }
  return sets;
}

export function nextSessionSet(sets: SessionSet[]): SessionSet {
  const lastSet = sets[sets.length - 1];
  return {
    setNumber: sets.length + 1,
    editedFields: "",
    reps: lastSet?.reps ?? null,
    weight: lastSet?.weight ?? null,
    distance: lastSet?.distance ?? null,
    duration: lastSet?.duration ?? null,
    rpe: lastSet?.rpe ?? null,
    heartRate: lastSet?.heartRate ?? null,
    completed: 0,
  };
}

export async function fetchLastCompletedSets(name: string) {
  const res = await api.workouts.exercises.progress(name);
  if (res?.sessions?.length) {
    const completedSessions = res.sessions.filter((s) => s.sets?.some((set) => set.completed === 1));
    if (completedSessions.length > 0) {
      return { res, lastSession: completedSessions[completedSessions.length - 1] };
    }
  }
  return null;
}

export function blankExerciseDraft(name: string): ExerciseRowData {
  return {
    name,
    category: DEFAULT_CATEGORY,
    sets: String(DEFAULT_SETS),
    reps: String(DEFAULT_REPS),
    weight: "",
    distance: "",
    distanceUnit: "km",
    duration: "",
    defaultRestTime: formatClockInput(DEFAULT_REST_SECONDS),
    equipment: "",
    perSide: false,
    isAssisted: false,
    trackingFields: { reps: true, time: false, weight: true, distance: false },
  };
}

export function draftFromSuggestion(
  name: string,
  sets?: number,
  reps?: number,
  equipment?: string,
  defaultRestTime?: number,
  defaultWeight?: number,
  defaultDistance?: number,
  defaultDuration?: number,
  perSide?: boolean,
  isAssisted?: boolean
): ExerciseRowData {
  return {
    name,
    category: DEFAULT_CATEGORY,
    sets: (sets ?? 3).toString(),
    reps: (reps ?? 8).toString(),
    weight: defaultWeight != null ? toInputString(Math.abs(defaultWeight)) : "",
    distance: toInputString(defaultDistance),
    distanceUnit: "km",
    duration: defaultDuration ? formatClockInput(defaultDuration) : "",
    defaultRestTime: formatClockInput(defaultRestTime ?? DEFAULT_REST_SECONDS),
    equipment: equipment || "",
    perSide: Boolean(perSide),
    isAssisted: Boolean(isAssisted),
    trackingFields: { reps: true, time: false, weight: true, distance: false },
  };
}

export function parseDraftValues(draft: ExerciseRowData) {
  const numSets = Math.max(1, parseInt(draft.sets, 10) || 3);
  const numReps = draft.trackingFields.reps ? (parseInt(draft.reps, 10) || 10) : null;
  const durationSecs = draft.trackingFields.time ? parseClock(draft.duration) : null;
  const parsedWeight = draft.trackingFields.weight ? parseDecimal(draft.weight) : null;
  const weightVal = parsedWeight !== null
    ? (draft.isAssisted ? -Math.abs(parsedWeight) : Math.abs(parsedWeight))
    : null;
  let distVal = draft.trackingFields.distance ? parseDecimal(draft.distance) : null;
  if (distVal !== null && draft.distanceUnit === "m") {
    distVal = distVal / 1000;
  }
  return {
    cat: normalizeCategory(draft.category),
    eq: normalizeEquipment(draft.equipment),
    numSets,
    numReps,
    durationSecs,
    hasWeightInput: parsedWeight !== null,
    weightVal,
    distVal,
  };
}

export function buildEditDraft(ex: SessionExercise): ExerciseRowData {
  const cat = normalizeCategory(ex.category);
  const eq = normalizeEquipment(ex.equipment) ?? "";
  const firstSet = ex.sets?.[0];
  const numSets = ex.sets?.length ? String(ex.sets.length) : String(DEFAULT_SETS);

  const reps = firstSet?.reps != null ? String(firstSet.reps) : (ex.templateExercise?.defaultReps?.toString() ?? String(DEFAULT_REPS));
  const weight = firstSet?.weight != null ? toInputString(Math.abs(firstSet.weight)) : (ex.templateExercise?.defaultWeight != null ? toInputString(Math.abs(ex.templateExercise.defaultWeight)) : "");
  const distance = firstSet?.distance != null ? toInputString(firstSet.distance) : toInputString(ex.templateExercise?.defaultDistance);
  const duration = firstSet?.duration != null ? formatClockInput(firstSet.duration) : formatClockInput(ex.templateExercise?.defaultDuration);
  const defaultRestTime = formatClockInput(getExerciseRestTime(ex));
  const perSide = ex.perSide != null ? Boolean(ex.perSide) : Boolean(ex.templateExercise?.perSide);
  const isAssisted = ex.isAssisted != null ? Boolean(ex.isAssisted) : Boolean(ex.templateExercise?.isAssisted);

  const hasReps = ex.sets?.some((s) => s.reps != null && s.reps > 0) ?? (cat !== "Cardio");
  const hasTime = ex.sets?.some((s) => s.duration != null && s.duration > 0) ?? (cat === "Cardio");
  const hasWeight = ex.sets?.some((s) => s.weight != null && s.weight !== undefined) ?? true;
  const hasDistance = ex.sets?.some((s) => s.distance != null && s.distance > 0) ?? (cat === "Cardio");

  return {
    name: ex.exerciseName,
    category: cat,
    sets: numSets,
    reps,
    weight,
    distance,
    distanceUnit: "km",
    duration,
    defaultRestTime,
    equipment: eq,
    perSide,
    isAssisted,
    trackingFields: {
      reps: hasReps,
      time: hasTime,
      weight: hasWeight,
      distance: hasDistance,
    },
  };
}

export function fillCompletedSetDefaults(
  ex: SessionExercise,
  set: SessionSet,
  setIndex: number,
  previousSetsMap: Record<string, SessionSet[]>
) {
  const prevSets = previousSetsMap[ex.exerciseName];
  const prevSet = prevSets?.[setIndex] ?? prevSets?.[prevSets.length - 1];
  const templateEx = ex.templateExercise;

  const defaultWeight = prevSets?.length ? highestCompletedWeight(prevSets) : templateEx?.defaultWeight ?? 0;
  const defaultReps = prevSet?.reps ?? templateEx?.defaultReps ?? DEFAULT_REPS;
  const defaultDistance = prevSet?.distance ?? templateEx?.defaultDistance ?? 0;
  const defaultDuration = prevSet?.duration ?? templateEx?.defaultDuration ?? 0;
  const defaultRpe = prevSet?.rpe ?? templateEx?.defaultRpe ?? null;
  const defaultHeartRate = prevSet?.heartRate ?? templateEx?.defaultHeartRate ?? null;

  const cat = trackingKind(ex.category);
  const isTimed = isTimedExercise(ex, previousSetsMap);
  const tracksWeight = ex.sets.some((s) => s.weight != null);
  const tracksReps = ex.sets.some((s) => s.reps != null);
  const tracksDuration = ex.sets.some((s) => s.duration != null);
  const tracksDistance = ex.sets.some((s) => s.distance != null);

  if (cat === "cardio") {
    if (tracksDistance) set.distance = set.distance ?? defaultDistance;
    if (tracksDuration) set.duration = set.duration ?? defaultDuration;
    set.heartRate = set.heartRate ?? defaultHeartRate;
  } else if (isTimed) {
    if (tracksDuration) set.duration = set.duration ?? (defaultDuration > 0 ? defaultDuration : null);
    if (tracksWeight) set.weight = set.weight ?? defaultWeight;
  } else {
    if (tracksWeight) set.weight = set.weight ?? defaultWeight;
    if (tracksReps) set.reps = set.reps ?? defaultReps;
    set.rpe = set.rpe ?? defaultRpe;
  }
}

export function scrollToSessionExercise(movedId: number) {
  setTimeout(() => {
    const el =
      document.getElementById(`session-exercise-${movedId}`) ||
      document.querySelector(`[data-ex-id="${movedId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isVeryTall = rect.height > window.innerHeight * 0.75;
      el.scrollIntoView({
        behavior: "smooth",
        block: isVeryTall ? "start" : "center",
      });
    }
  }, 60);
}
