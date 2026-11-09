import type { FullWorkoutSession, SessionSet } from "@backend/types/shared";
import { sessionElapsedSeconds } from "@/lib/workout-time";

export interface TemplatePrefillExercise {
  exerciseName: string;
  category?: string;
  equipment?: string | null;
  defaultSets: number;
  defaultReps: number | null;
  defaultWeight: number | null;
  defaultDistance: number | null;
  defaultDuration: number | null;
  defaultRpe: number | null;
  defaultHeartRate: number | null;
  defaultRestTime: number;
  perSide: number;
  isAssisted: number;
}

export interface TemplatePrefill {
  name: string;
  description: string;
  targetMuscleGroups: string;
  estimatedTime: number | null;
  exercises: TemplatePrefillExercise[];
}

export function isQuickStartSession(session: Pick<FullWorkoutSession, "templateId">): boolean {
  return session.templateId == null;
}

function pickReferenceSet(sets: SessionSet[]): SessionSet | null {
  const completed = sets.filter((s) => s.completed);
  const pool = completed.length > 0 ? completed : sets;
  if (pool.length === 0) return null;
  return pool.reduce((best, s) => (Math.abs(s.weight ?? 0) > Math.abs(best.weight ?? 0) ? s : best), pool[0]);
}

function positive(v: number | null | undefined): number | null {
  return v != null && v > 0 ? v : null;
}

function sessionMinutes(session: FullWorkoutSession): number | null {
  if (!session.completedAt) return null;
  const minutes = Math.round(sessionElapsedSeconds(session, Date.now()) / 60);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

export function sessionToTemplatePrefill(session: FullWorkoutSession): TemplatePrefill {
  const exercises = [...(session.exercises ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((ex) => ex.exerciseName?.trim())
    .map((ex): TemplatePrefillExercise => {
      const sets = ex.sets ?? [];
      const completedCount = sets.filter((s) => s.completed).length;
      const ref = pickReferenceSet(sets);
      return {
        exerciseName: ex.exerciseName,
        category: ex.category,
        equipment: ex.equipment ?? null,
        defaultSets: Math.max(1, completedCount || sets.length),
        defaultReps: ref?.reps ?? null,
        defaultWeight: ref?.weight ? ref.weight : null,
        defaultDistance: positive(ref?.distance),
        defaultDuration: positive(ref?.duration),
        defaultRpe: ref?.rpe ?? null,
        defaultHeartRate: ref?.heartRate ?? null,
        defaultRestTime: ex.restTime ?? 90,
        perSide: ex.perSide ? 1 : 0,
        isAssisted: ex.isAssisted ? 1 : 0,
      };
    });

  return {
    name: session.name?.trim() ?? "",
    description: "",
    targetMuscleGroups: "",
    estimatedTime: sessionMinutes(session),
    exercises,
  };
}
