import { daysBetween, today } from "./dates";

export const TODO_PALETTE = {
  coral: "#ff6b6b",
  orange: "#ff9f43",
  amber: "#ffd166",
  lime: "#a3e635",
  teal: "#2dd4bf",
  sky: "#38bdf8",
  blue: "#6c8cff",
  violet: "#a78bfa",
  pink: "#f472b6",
  slate: "#94a3b8",
} as const;

export type TodoColor = keyof typeof TODO_PALETTE;
export const TODO_COLORS = Object.keys(TODO_PALETTE) as [TodoColor, ...TodoColor[]];
export const TODO_ICONS = [
  "folder",
  "briefcase",
  "home",
  "heart",
  "dumbbell",
  "book",
  "code",
  "cart",
  "wallet",
  "plane",
  "car",
  "users",
  "graduation",
  "music",
  "palette",
  "leaf",
  "wrench",
  "sparkles",
  "utensils",
  "paw",
  "gamepad",
  "camera",
  "lightbulb",
  "zap",
] as const;
export type TodoIcon = (typeof TODO_ICONS)[number];
export const DEFAULT_TODO_ICON: TodoIcon = "folder";
export const SYSTEM_CATEGORY_ICON: TodoIcon = "zap";
export const UNCATEGORISED_COLOR = "#00e3a4";
export const SYSTEM_CATEGORY_COLOR: TodoColor = "violet";

export function isTodoColor(value: unknown): value is TodoColor {
  return typeof value === "string" && value in TODO_PALETTE;
}

export function todoColorHex(color: TodoColor | null | undefined): string {
  return color ? TODO_PALETTE[color] : UNCATEGORISED_COLOR;
}

export const TODO_SOURCES = ["cashflow", "minor"] as const;
export type TodoSource = (typeof TODO_SOURCES)[number];
export const SYSTEM_CATEGORY_NAME = "Automatisch";
export const SOURCE_PROJECT_NAMES: Record<TodoSource, string> = { cashflow: "Cashflow", minor: "Minor" };
export const SHOW_AND_GROW_TASK_TITLE = "Show & Grow voorbereiden";

export function invoiceTaskTitle(invoiceNumber: string, clientName: string | null): string {
  return clientName ? `Factuur ${invoiceNumber} · ${clientName}` : `Factuur ${invoiceNumber}`;
}

export const TODO_TITLE_MAX = 200;
export const TODO_NAME_MAX = 60;
export const TODO_NOTES_MAX = 20_000;

export function normalizeTodoTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isValidTodoTitle(value: string): boolean {
  const title = normalizeTodoTitle(value);
  return title.length > 0 && title.length <= TODO_TITLE_MAX;
}

export const LINKED_TASK_WINDOW_DAYS = 7;
export const HISTORY_PULSE_DAYS = 365;

export const AGING_STEPS = [
  { days: 60, opacity: 0.5 },
  { days: 30, opacity: 0.7 },
] as const;

export function daysToDue(dueDate: string, now: Date = new Date()): number {
  return daysBetween(today(now), dueDate);
}

export function isLinkedTaskVisible(dueDate: string, now: Date = new Date()): boolean {
  return daysToDue(dueDate, now) <= LINKED_TASK_WINDOW_DAYS;
}

export interface AgingInput {
  lastEditedAt: string;
  dueDate: string | null;
  sourceModule: TodoSource | null;
}

export function agingOpacity(task: AgingInput, now: Date = new Date()): number {
  if (task.sourceModule) return 1;
  if (task.dueDate && daysToDue(task.dueDate, now) > 0) return 1;
  const idle = daysBetween(today(new Date(task.lastEditedAt)), today(now));
  return AGING_STEPS.find((step) => idle >= step.days)?.opacity ?? 1;
}

export const QUICK_DATES = ["today", "tomorrow", "weekend", "nextWeek"] as const;
export type QuickDate = (typeof QUICK_DATES)[number];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function quickDate(kind: QuickDate, now: Date = new Date()): string {
  const base = today(now);
  const weekday = new Date(`${base}T12:00:00Z`).getUTCDay();
  if (kind === "today") return base;
  if (kind === "tomorrow") return addDays(base, 1);
  if (kind === "weekend") return weekday === 6 || weekday === 0 ? base : addDays(base, 6 - weekday);
  return addDays(base, (8 - weekday) % 7 || 7);
}

export const POSITION_STEP = 1;
const MIN_POSITION_GAP = 1e-9;

export function positionBefore(first: number | null | undefined): number {
  return first == null ? 0 : first - POSITION_STEP;
}

export function positionAfter(last: number | null | undefined): number {
  return last == null ? 0 : last + POSITION_STEP;
}

export function positionBetween(before: number | null | undefined, after: number | null | undefined): number | null {
  if (before == null) return positionBefore(after);
  if (after == null) return positionAfter(before);
  if (after - before < MIN_POSITION_GAP * 2) return null;
  return before + (after - before) / 2;
}

export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i * POSITION_STEP);
}
