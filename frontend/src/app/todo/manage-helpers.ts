import { normalizeTodoTitle, TODO_COLORS, TODO_NAME_MAX, type TodoColor } from "@backend/shared/todo";
import type { TodoCategory, TodoMove, TodoTask } from "@backend/types/todo";

export function applyMove(ids: number[], id: number, move: TodoMove): number[] | null {
  if (!ids.includes(id)) return null;
  const rest = ids.filter((other) => other !== id);
  const anchor = move.afterId ?? move.beforeId;
  const at = anchor === null ? 0 : rest.indexOf(anchor) + (move.afterId !== null ? 1 : 0);
  if (anchor !== null && rest.indexOf(anchor) === -1) return null;
  const next = [...rest.slice(0, at), id, ...rest.slice(at)];
  return next.every((value, i) => value === ids[i]) ? null : next;
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
