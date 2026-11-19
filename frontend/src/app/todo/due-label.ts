import { daysToDue, todoColorHex } from "@backend/shared/todo";
import type { TodoCategory, TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { customDateLabel } from "./chip-state";

export type DueTone = "overdue" | "today" | "soon" | "later";

export interface DueBadge {
  label: string;
  tone: DueTone;
}

const weekday = new Intl.DateTimeFormat("nl-NL", { weekday: "long", timeZone: "UTC" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function dueBadge(dueDate: string | null, now: Date = new Date()): DueBadge | null {
  if (!dueDate) return null;
  const days = daysToDue(dueDate, now);
  if (days === -1) return { label: t("todo.due.yesterday"), tone: "overdue" };
  if (days < 0) return { label: t("todo.due.late", { days: String(-days) }), tone: "overdue" };
  if (days === 0) return { label: t("todo.date.today"), tone: "today" };
  if (days === 1) return { label: t("todo.date.tomorrow"), tone: "soon" };
  if (days < 7) return { label: capitalize(weekday.format(new Date(`${dueDate}T12:00:00Z`))), tone: "soon" };
  return { label: capitalize(customDateLabel(dueDate)), tone: "later" };
}

export function taskColor(task: Pick<TodoTask, "categoryId">, categories: TodoCategory[]): string {
  const category = task.categoryId === null ? undefined : categories.find((c) => c.id === task.categoryId);
  return todoColorHex(category?.color ?? null);
}

export interface ListSummary {
  open: number;
  overdue: number;
  today: number;
}

export function listSummary(tasks: Pick<TodoTask, "dueDate">[], now: Date = new Date()): ListSummary {
  const summary = { open: tasks.length, overdue: 0, today: 0 };
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const days = daysToDue(task.dueDate, now);
    if (days < 0) summary.overdue += 1;
    else if (days === 0) summary.today += 1;
  }
  return summary;
}
