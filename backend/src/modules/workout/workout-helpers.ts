import { ValidationError, optionalInteger, optionalText, requireObject, requireText } from "../../utils/validation";

export const MAX_SETS_PER_EXERCISE = 50;
export const MAX_EXERCISES = 100;

export function validateSetParams(params: {
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
  heartRate?: number;
  defaultRestTime?: number;
}, prefix: string = "", allowNegativeWeight: boolean = false) {
  const fields: [string, unknown][] = [
    ["reps", params.reps], ["weight", params.weight], ["distance", params.distance], ["duration", params.duration],
    ["rpe", params.rpe], ["heart rate", params.heartRate], ["rest time", params.defaultRestTime],
  ];
  for (const [field, value] of fields) {
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new ValidationError(`${prefix ? prefix + " " : ""}${field} must be a number`);
    }
  }
  const getMsg = (field: string, suffix: string) => {
    if (prefix) {
      return `${prefix} ${field} ${suffix}`;
    }
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${suffix}`;
  };

  if (params.reps !== undefined && params.reps < 0) throw new ValidationError(getMsg("reps", "cannot be negative"));
  if (params.weight !== undefined && params.weight < 0 && !allowNegativeWeight) throw new ValidationError(getMsg("weight", "cannot be negative"));
  if (params.distance !== undefined && params.distance < 0) throw new ValidationError(getMsg("distance", "cannot be negative"));
  if (params.duration !== undefined && params.duration < 0) throw new ValidationError(getMsg("duration", "cannot be negative"));
  if (params.rpe !== undefined && (params.rpe < 0 || params.rpe > 10)) throw new ValidationError(getMsg("RPE", "must be 0-10"));
  if (params.heartRate !== undefined && params.heartRate < 0) throw new ValidationError(getMsg("heart rate", "cannot be negative"));
  if (params.defaultRestTime !== undefined && params.defaultRestTime < 0) throw new ValidationError(getMsg("rest time", "cannot be negative"));
}

export type TemplateExerciseInput = {
  exerciseName: string;
  category?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
  heartRate?: number;
  defaultRestTime?: number;
  equipment?: string;
  perSide?: number;
  isAssisted?: number;
};

export function validateTemplateInput(data: any, requireName: boolean) {
  const input = requireObject(data);
  if (requireName || input.name !== undefined) requireText(input.name, "Name");
  optionalText(input.description, "Description");
  optionalText(input.targetMuscleGroups, "Target muscle groups");
  optionalInteger(input.estimatedTime, "Estimated time");
  if (input.estimatedTime !== undefined && input.estimatedTime !== null && input.estimatedTime < 0) {
    throw new ValidationError("Estimated time cannot be negative");
  }
  if (input.exercises !== undefined && input.exercises !== null && !Array.isArray(input.exercises)) {
    throw new ValidationError("Exercises must be a list");
  }
  if (Array.isArray(input.exercises) && input.exercises.length > MAX_EXERCISES) {
    throw new ValidationError(`A template can have at most ${MAX_EXERCISES} exercises`);
  }
  for (const raw of input.exercises ?? []) {
    const ex = requireObject(raw, "Exercise");
    requireText(ex.exerciseName, "Exercise name");
    optionalText(ex.category, "Category", 100);
    optionalText(ex.equipment, "Equipment", 100);
    if (ex.sets !== undefined && (typeof ex.sets !== "number" || !Number.isInteger(ex.sets) || ex.sets < 1)) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" must have at least 1 set`);
    }
    if (ex.sets !== undefined && ex.sets > MAX_SETS_PER_EXERCISE) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" can have at most ${MAX_SETS_PER_EXERCISE} sets`);
    }
    if (ex.reps !== undefined && ex.reps !== null && (typeof ex.reps !== "number" || !Number.isFinite(ex.reps))) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" reps must be a number`);
    }
    optionalInteger(ex.perSide, "Per side");
    optionalInteger(ex.isAssisted, "Assisted");
    validateSetParams(ex, `Exercise "${ex.exerciseName}"`, Boolean(ex.isAssisted));
  }
}

export function templateExerciseValues(templateId: number, ex: TemplateExerciseInput, index: number) {
  return {
    templateId,
    exerciseName: ex.exerciseName,
    sortOrder: index,
    category: ex.category ?? "Free Weights",
    defaultSets: ex.sets,
    defaultReps: ex.reps ?? undefined,
    defaultWeight: ex.weight,
    defaultDistance: ex.distance,
    defaultDuration: ex.duration,
    defaultRpe: ex.rpe,
    defaultHeartRate: ex.heartRate,
    defaultRestTime: ex.defaultRestTime,
    equipment: ex.equipment,
    perSide: ex.perSide ?? 0,
    isAssisted: ex.isAssisted ?? 0,
  };
}

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
}

export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

export function signedWeight(weight: number | null | undefined, assisted: number | null | undefined): number | null {
  if (weight == null) return null;
  return assisted ? -Math.abs(weight) : weight;
}

export function effectiveVolume(weight: number | null | undefined, reps: number | null | undefined): number {
  return Math.max(0, weight ?? 0) * (reps ?? 0);
}

export function activeSeconds(session: { startedAt: string; completedAt: string | null; pausedAt: string | null; pausedSeconds: number }, nowMs: number): number {
  const startMs = parseDateString(session.startedAt).getTime();
  if (session.completedAt) {
    return Math.max(0, (parseDateString(session.completedAt).getTime() - startMs) / 1000);
  }
  let paused = session.pausedSeconds ?? 0;
  if (session.pausedAt) {
    paused += Math.max(0, (nowMs - parseDateString(session.pausedAt).getTime()) / 1000);
  }
  return Math.max(0, (nowMs - startMs) / 1000 - paused);
}

export function formatDutchDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("nl-NL", options);
}
