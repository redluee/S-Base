import { normalizeTodoTitle, TODO_COLORS, TODO_NAME_MAX, type TodoColor } from "@backend/shared/todo";
import type { TodoCategory, TodoTask } from "@backend/types/todo";

export function moveId(ids: number[], id: number, delta: -1 | 1): number[] | null {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function nextFreeColor(categories: Pick<TodoCategory, "color">[]): TodoColor {
  const used = new Set(categories.map((c) => c.color));
  return TODO_COLORS.find((color) => !used.has(color)) ?? TODO_COLORS[categories.length % TODO_COLORS.length];
}

export function openTaskCount(tasks: Pick<TodoTask, "categoryId">[], categoryId: number): number {
  return tasks.filter((task) => task.categoryId === categoryId).length;
}

export function cleanName(value: string): string | null {
  const name = normalizeTodoTitle(value);
  return name.length > 0 && name.length <= TODO_NAME_MAX ? name : null;
}
