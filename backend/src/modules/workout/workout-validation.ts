import { ValidationError } from "../../utils/errors";

export const MAX_SETS_PER_EXERCISE = 50;
export const MAX_EXERCISES = 100;

export type SetParams = {
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  rpe?: number | null;
  heartRate?: number | null;
  defaultRestTime?: number | null;
};

const SET_FIELDS = ["reps", "weight", "distance", "duration", "rpe", "heartRate", "defaultRestTime"] as const;

const NEGATIVE_KEYS = {
  reps: "workout.repsNegative",
  weight: "workout.weightNegative",
  distance: "workout.distanceNegative",
  duration: "workout.durationNegative",
  heartRate: "workout.heartRateNegative",
  defaultRestTime: "workout.restTimeNegative",
} as const;

export function invalidRequest(): ValidationError {
  return new ValidationError("common.invalidRequest");
}

export function requireId(value: unknown): number {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1) throw new ValidationError("workout.invalidId");
  return n;
}

export function requireName(value: unknown, key = "workout.nameRequired", maxLength = 200): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(key);
  if (value.length > maxLength) throw new ValidationError("workout.textTooLong", { max: maxLength });
  return value;
}

export function optionalText(value: unknown, maxLength = 5000): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") throw invalidRequest();
  if (value.length > maxLength) throw new ValidationError("workout.textTooLong", { max: maxLength });
}

export function optionalInteger(value: unknown): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isInteger(value)) throw invalidRequest();
}

export function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidRequest();
  return value as Record<string, unknown>;
}

export function requireDateTime(value: unknown): void {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(new Date(value).getTime())) {
    throw new ValidationError("workout.invalidDate");
  }
}

export function validateSetParams(params: SetParams, allowNegativeWeight = false): void {
  for (const field of SET_FIELDS) {
    const value = params[field];
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      throw invalidRequest();
    }
  }
  for (const field of Object.keys(NEGATIVE_KEYS) as (keyof typeof NEGATIVE_KEYS)[]) {
    const value = params[field];
    if (value == null || value >= 0) continue;
    if (field === "weight" && allowNegativeWeight) continue;
    throw new ValidationError(NEGATIVE_KEYS[field]);
  }
  if (params.rpe != null && (params.rpe < 0 || params.rpe > 10)) throw new ValidationError("workout.rpeRange");
}

function requireSetCount(sets: unknown, exerciseName: string): void {
  if (!Array.isArray(sets)) throw invalidRequest();
  if (sets.length > MAX_SETS_PER_EXERCISE) {
    throw new ValidationError("workout.tooManySets", { exerciseName, max: MAX_SETS_PER_EXERCISE });
  }
}

function requireExerciseCount(exercises: unknown, key: string): void {
  if (!Array.isArray(exercises)) throw invalidRequest();
  if (exercises.length > MAX_EXERCISES) throw new ValidationError(key, { max: MAX_EXERCISES });
}

export function validateTemplateInput(data: unknown, requireTemplateName: boolean): void {
  const input = requireObject(data);
  if (requireTemplateName || input.name !== undefined) requireName(input.name, "workout.templateNameRequired");
  optionalText(input.description);
  optionalText(input.targetMuscleGroups);
  optionalInteger(input.estimatedTime);
  if (typeof input.estimatedTime === "number" && input.estimatedTime < 0) {
    throw new ValidationError("workout.estimatedTimeNegative");
  }
  if (input.exercises === undefined || input.exercises === null) return;
  requireExerciseCount(input.exercises, "workout.tooManyTemplateExercises");
  for (const raw of input.exercises as unknown[]) {
    const ex = requireObject(raw);
    const exerciseName = requireName(ex.exerciseName, "workout.exerciseNameRequired");
    optionalText(ex.category, 100);
    optionalText(ex.equipment, 100);
    if (ex.sets !== undefined) {
      if (typeof ex.sets !== "number" || !Number.isInteger(ex.sets) || ex.sets < 1) {
        throw new ValidationError("workout.exerciseNeedsSet", { exerciseName });
      }
      if (ex.sets > MAX_SETS_PER_EXERCISE) {
        throw new ValidationError("workout.tooManySets", { exerciseName, max: MAX_SETS_PER_EXERCISE });
      }
    }
    optionalInteger(ex.perSide);
    optionalInteger(ex.isAssisted);
    validateSetParams(ex, Boolean(ex.isAssisted));
  }
}

export function validateSessionInput(input: Record<string, unknown>, ownedExerciseIds: Set<number>): void {
  if (input.name !== undefined && input.name !== null) requireName(input.name);
  optionalText(input.notes, 20000);
  if (input.completedAt !== undefined && input.completedAt !== null) requireDateTime(input.completedAt);
  if (input.pausedAt !== undefined && input.pausedAt !== null) requireDateTime(input.pausedAt);
  optionalInteger(input.pausedSeconds);
  if (typeof input.pausedSeconds === "number" && input.pausedSeconds < 0) {
    throw new ValidationError("workout.pausedSecondsNegative");
  }
  if (input.exercises === undefined) return;
  requireExerciseCount(input.exercises, "workout.tooManySessionExercises");
  for (const raw of input.exercises as unknown[]) {
    const ex = requireObject(raw);
    const exerciseName = requireName(ex.exerciseName, "workout.exerciseNameRequired");
    optionalText(ex.category, 100);
    optionalText(ex.equipment, 100);
    optionalInteger(ex.sortOrder);
    optionalInteger(ex.perSide);
    optionalInteger(ex.isAssisted);
    optionalInteger(ex.restTime);
    if (typeof ex.restTime === "number" && ex.restTime < 0) throw new ValidationError("workout.restTimeNegative");
    const id = ex.sessionExerciseId;
    if (id !== undefined && id !== null && (!Number.isInteger(id) || !ownedExerciseIds.has(id as number))) {
      throw new ValidationError("workout.exerciseNotInSession", { sessionExerciseId: id });
    }
    if (ex.sets === undefined || ex.sets === null) continue;
    requireSetCount(ex.sets, exerciseName);
    for (const rawSet of ex.sets as unknown[]) {
      const set = requireObject(rawSet);
      if (typeof set.setNumber !== "number" || !Number.isInteger(set.setNumber) || set.setNumber < 1) {
        throw new ValidationError("workout.setNumberInvalid");
      }
      optionalInteger(set.completed);
      optionalText(set.editedFields, 100);
      validateSetParams(set, Boolean(ex.isAssisted));
    }
  }
}
