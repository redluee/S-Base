import { normalizeCategory, normalizeEquipment } from "../../shared/workout";
import { parseDateString } from "../../shared/dates";
import { normalizeSearchString } from "../../shared/search";
import type { TemplateExerciseInput } from "./workout-schemas";

export function templateExerciseValues(templateId: number, ex: TemplateExerciseInput, index: number) {
  return {
    templateId,
    exerciseName: ex.exerciseName,
    sortOrder: index,
    category: normalizeCategory(ex.category),
    defaultSets: ex.sets,
    defaultReps: ex.reps ?? undefined,
    defaultWeight: ex.weight,
    defaultDistance: ex.distance,
    defaultDuration: ex.duration,
    defaultRpe: ex.rpe,
    defaultHeartRate: ex.heartRate,
    defaultRestTime: ex.defaultRestTime,
    equipment: normalizeEquipment(ex.equipment),
    perSide: ex.perSide ?? 0,
    isAssisted: ex.isAssisted ?? 0,
  };
}

export function formatDutchDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("nl-NL", options);
}

export function sessionMatchesQuery(
  startedAt: string,
  name: string | null,
  notes: string | null,
  normalizedQ: string,
): boolean {
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
