import type { PersonalRecord } from "@backend/types/shared";
import { t } from "./lang";
import { formatNumberNl } from "./number-input";

type RecordLike = PersonalRecord & { assisted?: boolean };

export function formatPRValue(value: number, unit: string): string {
  if (unit === "sec") {
    const hrs = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  if (unit === "exercises" || unit === "sets" || unit === "reps") {
    return formatNumberNl(value);
  }
  return `${formatNumberNl(value)} ${unit}`;
}

export function isAssistedRecord(pr: RecordLike): boolean {
  if (pr.type !== "weight") return false;
  return pr.assisted === true || pr.newValue < 0;
}

const TYPE_LABELS: Record<PersonalRecord["type"], string> = {
  weight: "Max weight",
  reps: "Max reps",
  sets: "Max sets",
  volume: "Max volume",
  distance: "Max distance",
  duration: "Max duration",
  session_volume: "Total workout volume",
  session_duration: "Workout duration",
  session_exercises: "Exercises completed",
};

const SESSION_TYPES = new Set<PersonalRecord["type"]>(["session_volume", "session_duration", "session_exercises"]);

export function formatPersonalRecord(pr: RecordLike): { label: string; value: string } {
  const assisted = isAssistedRecord(pr);
  const newValue = assisted ? Math.abs(pr.newValue) : pr.newValue;
  const prevValue = assisted ? Math.abs(pr.prevValue) : pr.prevValue;
  const formattedNew = formatPRValue(newValue, pr.unit);
  const prevText = prevValue > 0 ? ` (${t("was")} ${formatPRValue(prevValue, pr.unit)})` : "";

  const typeLabel = assisted ? t("Less assistance") : TYPE_LABELS[pr.type] ? t(TYPE_LABELS[pr.type]) : null;
  let label: string;
  if (SESSION_TYPES.has(pr.type) && typeLabel) {
    label = typeLabel;
  } else if (typeLabel) {
    label = pr.exerciseName ? `${pr.exerciseName}: ${typeLabel}` : typeLabel;
  } else {
    label = pr.exerciseName || t("Record");
  }

  return { label, value: `${formattedNew}${prevText}` };
}
