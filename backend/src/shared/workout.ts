import { parseDateString } from "./dates";

export const EXERCISE_CATEGORIES = ["Free Weights", "Machines", "Bodyweight", "Cardio", "Functional"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export const DEFAULT_CATEGORY: ExerciseCategory = "Free Weights";

export type TrackingKind = "resistance" | "bodyweight" | "cardio" | "isometric";

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const DEFAULT_REST_SECONDS = 90;

const CATEGORY_ALIASES: Record<string, ExerciseCategory> = {
  "free weights": "Free Weights",
  freeweights: "Free Weights",
  resistance: "Free Weights",
  machines: "Machines",
  machine: "Machines",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
  functional: "Functional",
  isometric: "Functional",
};

const TRACKING_BY_CATEGORY: Record<ExerciseCategory, TrackingKind> = {
  "Free Weights": "resistance",
  Machines: "resistance",
  Bodyweight: "bodyweight",
  Cardio: "cardio",
  Functional: "isometric",
};

const EQUIPMENT_ALIASES: Record<string, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  cable: "Cable",
  machine: "Machine",
  band: "Resistance Band",
  ball: "Medicine Ball",
  bal: "Medicine Ball",
};

const NO_EQUIPMENT = new Set(["", "none", "null", "undefined"]);

export function normalizeCategory(raw: string | null | undefined): ExerciseCategory {
  return CATEGORY_ALIASES[(raw ?? "").trim().toLowerCase()] ?? DEFAULT_CATEGORY;
}

export function trackingKind(category: string | null | undefined): TrackingKind {
  return TRACKING_BY_CATEGORY[normalizeCategory(category)];
}

export function normalizeEquipment(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (NO_EQUIPMENT.has(value.toLowerCase())) return null;
  return EQUIPMENT_ALIASES[value.toLowerCase()] ?? value;
}

export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

export function signedWeight(weight: number | null | undefined, assisted: number | boolean | null | undefined) {
  if (weight == null) return null;
  return assisted ? -Math.abs(weight) : weight;
}

export function effectiveVolume(weight: number | null | undefined, reps: number | null | undefined): number {
  return Math.max(0, weight ?? 0) * (reps ?? 0);
}

export function highestCompletedWeight(sets: { weight?: number | null; completed?: number }[]): number | null {
  const weights = sets.filter((set) => set.completed !== 0 && set.weight != null).map((set) => set.weight!);
  return weights.length ? Math.max(...weights) : null;
}

export function activeSeconds(
  session: { startedAt: string; completedAt: string | null; pausedAt: string | null; pausedSeconds: number },
  nowMs: number,
): number {
  const startMs = parseDateString(session.startedAt).getTime();
  if (session.completedAt) return Math.max(0, (parseDateString(session.completedAt).getTime() - startMs) / 1000);
  let paused = session.pausedSeconds ?? 0;
  if (session.pausedAt) paused += Math.max(0, (nowMs - parseDateString(session.pausedAt).getTime()) / 1000);
  return Math.max(0, (nowMs - startMs) / 1000 - paused);
}
