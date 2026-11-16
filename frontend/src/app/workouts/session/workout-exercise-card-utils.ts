import { t } from "@/lib/lang";
import { formatNumberNl, toInputString } from "@/app/workouts/number-input";
import type { SessionExercise, SessionSet } from "@backend/types/shared";
import { normalizeCategory, trackingKind, type TrackingKind } from "@backend/shared/workout";
import { formatClock } from "@/app/workouts/duration";

export type InputKind = "decimal" | "integer" | "time";

export function isExerciseFinished(ex: SessionExercise): boolean {
  const sets = ex.sets ?? [];
  return sets.length > 0 && sets.every((set) => set.completed === 1);
}

export function areAllExercisesFinished(exercises: SessionExercise[]): boolean {
  return exercises.length > 0 && exercises.every(isExerciseFinished);
}

export function exerciseTagLabels(
  category: string | null | undefined,
  equipment: string | null | undefined,
  isAssisted: boolean
): string[] {
  const items = (equipment ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "" && item.toLowerCase() !== "none");
  const labels = [t(normalizeCategory(category)), ...items.map((item) => t(item))];
  if (isAssisted) labels.push(t("Assisted"));
  return labels;
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

  const cat = trackingKind(ex.category);
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

  const cat = trackingKind(ex.category);
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


export type ColumnKey = "weight" | "reps" | "distance" | "duration" | "heartRate";

export interface SetColumn {
  key: ColumnKey;
  label: string;
  kind: InputKind;
  perSide?: boolean;
}

export function getColumns(
  cat: TrackingKind,
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

export function formatColumnValue(
  col: SetColumn,
  cat: TrackingKind,
  raw: number | null | undefined
): string {
  if (raw === null || raw === undefined) return "";
  if (col.kind === "time") return formatClock(raw);
  if (col.kind === "decimal") return toInputString(cat === "bodyweight" && col.key === "weight" ? Math.abs(raw) : raw);
  return String(raw);
}

export function describeTarget(
  cat: TrackingKind,
  isTimed: boolean,
  target: Partial<SessionSet> | null
): string {
  if (!target) return "—";
  const kg = (w: number) => `${formatNumberNl(w)} kg`;
  const signed = (w: number) => `${w > 0 ? "+" : ""}${formatNumberNl(w)} kg`;
  const hasTimeTarget =
    target.duration != null && target.duration > 0 && (target.reps == null || target.reps === 0 || isTimed);

  if (hasTimeTarget) {
    const durStr = formatClock(target.duration) || `${target.duration}s`;
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
    return `${formatNumberNl(target.distance ?? 0)} km x ${formatClock(target.duration ?? 0) || "0:00"}`;
  }
  const reps = target.reps ?? 10;
  if (target.weight != null && target.weight !== 0) return `${reps} x ${kg(target.weight)}`;
  return `${reps} ${t("reps")}`;
}

