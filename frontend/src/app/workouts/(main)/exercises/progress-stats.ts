import { effectiveVolume } from "@backend/shared/workout";
import { parseDateString } from "@backend/shared/dates";
import type { ExerciseProgressSession, ExerciseProgressSet } from "@backend/types/workout";

export type ProgressRange = "1M" | "1Y" | "all";
export type StatMode = "weight" | "reps" | "time";

const DAY = 24 * 60 * 60 * 1000;

export function filterByRange<T extends { startedAt: string }>(sessions: T[], range: ProgressRange, now: Date): T[] {
  if (range === "all") return sessions;
  const days = range === "1M" ? 31 : 366;
  const cutoff = now.getTime() - days * DAY;
  return sessions.filter((s) => parseDateString(s.startedAt).getTime() >= cutoff);
}

export function statModeFor(sets: ExerciseProgressSet[]): StatMode {
  if (sets.some((s) => s.weight != null && s.weight !== 0)) return "weight";
  if (sets.some((s) => (s.reps ?? 0) > 0)) return "reps";
  return "time";
}

function doneSets(session: ExerciseProgressSession) {
  const completed = session.sets.filter((s) => s.completed === 1);
  return completed.length > 0 ? completed : session.sets;
}

export function topValue(session: ExerciseProgressSession, mode: StatMode): number {
  const sets = doneSets(session);
  if (mode === "weight") return Math.max(0, ...sets.map((s) => s.weight ?? 0));
  if (mode === "reps") return Math.max(0, ...sets.map((s) => s.reps ?? 0));
  return Math.max(0, ...sets.map((s) => s.duration ?? 0));
}

export function sessionVolume(session: ExerciseProgressSession): number {
  return doneSets(session).reduce((sum, s) => sum + effectiveVolume(s.weight, s.reps), 0);
}

export function progressSummary(sessions: ExerciseProgressSession[], mode: StatMode) {
  const values = sessions.map((s) => topValue(s, mode));
  const latest = values.at(-1) ?? 0;
  const delta = values.length > 1 ? latest - values[0] : 0;

  let peak: { value: number; startedAt: string } | null = null;
  for (const session of sessions) {
    const volume = sessionVolume(session);
    if (volume > 0 && (!peak || volume > peak.value)) peak = { value: volume, startedAt: session.startedAt };
  }

  const completed = sessions.flatMap((s) => s.sets.filter((set) => set.completed === 1));
  const completedReps = completed.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = completed.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const weighted = completed.filter((s) => s.weight != null && s.weight !== 0);
  const workingWeight =
    weighted.length > 0 ? weighted.reduce((sum, s) => sum + (s.weight ?? 0), 0) / weighted.length : null;
  const avgReps = weighted.length > 0 ? weighted.reduce((sum, s) => sum + (s.reps ?? 0), 0) / weighted.length : null;

  return { values, latest, delta, peak, completedReps, totalDuration, workingWeight, avgReps };
}

export function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${p2.x},${p2.y}`;
  }
  return d;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
