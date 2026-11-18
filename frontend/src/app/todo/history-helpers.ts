import { APP_TIME_ZONE, today } from "@backend/shared/dates";
import type { TodoHistoryTask, TodoPulsePoint } from "@backend/types/todo";
import { t } from "@/lib/lang";

const DAY_MS = 86_400_000;

const dayPartsFormat = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

export interface HistoryDayGroup {
  date: string;
  label: string;
  items: TodoHistoryTask[];
}

export function dayKey(iso: string): string {
  return today(new Date(iso));
}

function shiftDay(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayLabel(date: string, now: Date = new Date()): string {
  const current = today(now);
  if (date === current) return t("todo.history.today");
  if (date === shiftDay(current, -1)) return t("todo.history.yesterday");
  const parts = dayPartsFormat.formatToParts(new Date(`${date}T12:00:00Z`));
  const part = (type: string) => (parts.find((p) => p.type === type)?.value ?? "").replace(".", "");
  const label = `${part("weekday")} ${part("day")} ${part("month")}`;
  return date.slice(0, 4) === current.slice(0, 4) ? label : `${label} ${date.slice(0, 4)}`;
}

export function groupByDay(items: TodoHistoryTask[], now: Date = new Date()): HistoryDayGroup[] {
  const groups: HistoryDayGroup[] = [];
  for (const item of items) {
    const date = dayKey(item.completedAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(item);
    else groups.push({ date, label: dayLabel(date, now), items: [item] });
  }
  return groups;
}

export function mergeItems(existing: TodoHistoryTask[], incoming: TodoHistoryTask[]): TodoHistoryTask[] {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
}

export function formatCompletedDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function movingAverage(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - radius);
    const to = Math.min(values.length - 1, i + radius);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += values[j];
    return sum / (to - from + 1);
  });
}

export interface Point {
  x: number;
  y: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let path = `M${round(first.x)} ${round(first.y)}`;
  if (rest.length === 0) return path;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    path += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return path;
}

export function pulsePoints(values: number[], width: number, height: number, pad = 2): Point[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const usable = height - pad * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, i) => ({ x: i * step, y: pad + usable - (value / max) * usable }));
}

export function pulsePath(points: TodoPulsePoint[], width: number, height: number, radius = 7): string {
  const smoothed = movingAverage(
    points.map((p) => p.count),
    radius,
  );
  return smoothPath(pulsePoints(smoothed, width, height));
}
