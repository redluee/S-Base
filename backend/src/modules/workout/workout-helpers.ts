import { normalizeSearchString } from "../../utils/search";
import type { TemplateExerciseInput } from "./workout-schemas";

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

export function sessionMatchesQuery(startedAt: string, name: string | null, notes: string | null, normalizedQ: string): boolean {
  const date = parseDateString(startedAt);
  const dayRaw = String(date.getDate());
  const monthRaw = String(date.getMonth() + 1);
  const year = String(date.getFullYear());
  const day = dayRaw.padStart(2, "0");
  const month = monthRaw.padStart(2, "0");
  const dateFormats = [
    formatDutchDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    formatDutchDate(date, { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
  ].map(normalizeSearchString);
  const candidates = [
    normalizeSearchString(name || ""),
    normalizeSearchString(notes || ""),
    ...dateFormats,
    `${day}${month}${year}`,
    `${day}${month}`,
    `${dayRaw}${monthRaw}${year}`,
    `${dayRaw}${monthRaw}`,
  ];
  return candidates.some((candidate) => candidate.includes(normalizedQ));
}
