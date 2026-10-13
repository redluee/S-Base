import { t } from "@/lib/lang";
import { formatNumberNl, toInputString } from "@/lib/number-input";
import type { SessionExercise, SessionSet } from "@backend/types/shared";

export type InputKind = "decimal" | "integer" | "time";

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

export function formatSecs(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined || isNaN(secVal)) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function parseSecs(val: string): number | null {
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
export type ColumnKey = "weight" | "reps" | "distance" | "duration" | "heartRate";

export interface SetColumn {
  key: ColumnKey;
  label: string;
  kind: InputKind;
  perSide?: boolean;
}

export function getColumns(
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

export function formatColumnValue(
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

export function formatTime(totalSeconds: number): string {
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
