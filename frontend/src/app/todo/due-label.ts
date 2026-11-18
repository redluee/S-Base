import { daysToDue, todoColorHex } from "@backend/shared/todo";
import type { TodoCategory, TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";

export function dayCounter(dueDate: string | null, now: Date = new Date()): { label: string; overdue: boolean } | null {
  if (!dueDate) return null;
  const days = daysToDue(dueDate, now);
  return { label: t("todo.days", { days: String(days) }), overdue: days < 0 };
}

export function duePhrase(dueDate: string, now: Date = new Date()): string {
  const days = daysToDue(dueDate, now);
  if (days === 0) return t("todo.date.dueToday");
  if (days === 1) return t("todo.date.inOneDay");
  if (days === -1) return t("todo.date.oneDayAgo");
  if (days > 1) return t("todo.date.inDays", { days: String(days) });
  return t("todo.date.daysAgo", { days: String(-days) });
}

export function taskColor(task: Pick<TodoTask, "categoryId">, categories: TodoCategory[]): string {
  const category = task.categoryId === null ? undefined : categories.find((c) => c.id === task.categoryId);
  return todoColorHex(category?.color ?? null);
}
