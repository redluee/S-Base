import { positionBetween, rebalancedPositions } from "@backend/shared/todo";
import type {
  TodoCategory,
  TodoHistoryTask,
  TodoMove,
  TodoProject,
  TodoSnapshot,
  TodoSubtask,
  TodoTask,
  TodoTaskPatch,
} from "@backend/types/todo";

export type TodoFilter =
  | { kind: "all" }
  | { kind: "flagged" }
  | { kind: "category"; categoryId: number; projectId: number | null };

export const ALL_TASKS: TodoFilter = { kind: "all" };

export interface TodoState extends TodoSnapshot {
  filter: TodoFilter;
}

export function emptyState(): TodoState {
  return { tasks: [], categories: [], projects: [], completedCount: 0, recentCompleted: [], filter: ALL_TASKS };
}

export const RECENT_COMPLETED = 3;

export function fromSnapshot(snapshot: TodoSnapshot, filter: TodoFilter): TodoState {
  return {
    ...snapshot,
    tasks: sortByPosition(snapshot.tasks),
    recentCompleted: snapshot.recentCompleted.slice(0, RECENT_COMPLETED),
    filter: validFilter(filter, snapshot),
  };
}

export function withRecentCompletion(
  recent: TodoHistoryTask[],
  task: TodoTask,
  categories: TodoCategory[],
  completedAt: string,
): TodoHistoryTask[] {
  const category = categories.find((c) => c.id === task.categoryId);
  const entry: TodoHistoryTask = {
    ...task,
    completedAt,
    categoryName: category?.name ?? null,
    categoryColor: category?.color ?? null,
  };
  return [entry, ...recent.filter((r) => r.id !== task.id)].slice(0, RECENT_COMPLETED);
}

export function sortByPosition<T extends { position: number; id: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id - b.id);
}

export function validFilter(filter: TodoFilter, data: Pick<TodoSnapshot, "categories" | "projects">): TodoFilter {
  if (filter.kind !== "category") return filter;
  if (!data.categories.some((c) => c.id === filter.categoryId)) return ALL_TASKS;
  if (filter.projectId !== null && !data.projects.some((p) => p.id === filter.projectId)) {
    return { ...filter, projectId: null };
  }
  return filter;
}

export function matchesFilter(task: TodoTask, filter: TodoFilter): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "flagged") return task.flagged;
  if (task.categoryId !== filter.categoryId) return false;
  return filter.projectId === null || task.projectId === filter.projectId;
}

export function filterTasks(tasks: TodoTask[], filter: TodoFilter): TodoTask[] {
  return tasks.filter((task) => matchesFilter(task, filter));
}

export function toggleFilter(current: TodoFilter, next: TodoFilter): TodoFilter {
  if (next.kind === "all") return ALL_TASKS;
  if (current.kind === "flagged" && next.kind === "flagged") return ALL_TASKS;
  if (current.kind === "category" && next.kind === "category" && current.categoryId === next.categoryId) {
    if (next.projectId === null && current.projectId === null) return ALL_TASKS;
    if (next.projectId === current.projectId) return { ...current, projectId: null };
  }
  return next;
}

export function filterPreselection(filter: TodoFilter): { categoryId: number | null; projectId: number | null } {
  return filter.kind === "category"
    ? { categoryId: filter.categoryId, projectId: filter.projectId }
    : { categoryId: null, projectId: null };
}

export function upsertTask(tasks: TodoTask[], task: TodoTask): TodoTask[] {
  const rest = tasks.filter((t) => t.id !== task.id);
  return task.completedAt ? rest : sortByPosition([...rest, task]);
}

export function replaceTaskId(tasks: TodoTask[], fromId: number, task: TodoTask): TodoTask[] {
  return upsertTask(
    tasks.filter((t) => t.id !== fromId),
    task,
  );
}

export function removeTask(tasks: TodoTask[], id: number): TodoTask[] {
  return tasks.filter((t) => t.id !== id);
}

export function patchTask(tasks: TodoTask[], id: number, patch: TodoTaskPatch, editedAt: string): TodoTask[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch, lastEditedAt: editedAt } : t));
}

export function topPosition(tasks: TodoTask[]): number {
  return positionBetween(null, tasks[0]?.position) ?? 0;
}

export function positionForMove(tasks: TodoTask[], id: number, move: TodoMove): number | null {
  const others = sortByPosition(tasks.filter((t) => t.id !== id));
  if (move.afterId !== null) {
    const index = others.findIndex((t) => t.id === move.afterId);
    if (index === -1) return null;
    return positionBetween(others[index].position, others[index + 1]?.position);
  }
  if (move.beforeId !== null) {
    const index = others.findIndex((t) => t.id === move.beforeId);
    if (index === -1) return null;
    return positionBetween(others[index - 1]?.position, others[index].position);
  }
  return positionBetween(null, others[0]?.position);
}

export function moveTask(tasks: TodoTask[], id: number, move: TodoMove): TodoTask[] {
  const position = positionForMove(tasks, id, move);
  if (position !== null) return sortByPosition(tasks.map((t) => (t.id === id ? { ...t, position } : t)));
  const others = sortByPosition(tasks.filter((t) => t.id !== id));
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;
  const anchor = move.afterId ?? move.beforeId;
  const index = anchor === null ? -1 : others.findIndex((t) => t.id === anchor);
  const insertAt = move.afterId !== null ? index + 1 : Math.max(0, index);
  const ordered = [...others.slice(0, insertAt), moving, ...others.slice(insertAt)];
  const positions = rebalancedPositions(ordered.length);
  return ordered.map((t, i) => ({ ...t, position: positions[i] }));
}

export function patchSubtasks(
  tasks: TodoTask[],
  taskId: number,
  update: (subtasks: TodoSubtask[]) => TodoSubtask[],
): TodoTask[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, subtasks: sortByPosition(update(t.subtasks)) } : t));
}

export function taskOfSubtask(tasks: TodoTask[], subtaskId: number): TodoTask | undefined {
  return tasks.find((t) => t.subtasks.some((s) => s.id === subtaskId));
}

export function categoryById(categories: TodoCategory[], id: number | null): TodoCategory | undefined {
  return id === null ? undefined : categories.find((c) => c.id === id);
}

export function projectsOf(projects: TodoProject[], categoryId: number | null): TodoProject[] {
  return categoryId === null
    ? []
    : [...projects.filter((p) => p.categoryId === categoryId)].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function manualCategories(categories: TodoCategory[]): TodoCategory[] {
  return categories.filter((c) => !c.isSystem);
}

export function removeCategoryLocally(state: TodoState, id: number): TodoState {
  const projectIds = new Set(state.projects.filter((p) => p.categoryId === id).map((p) => p.id));
  return {
    ...state,
    categories: state.categories.filter((c) => c.id !== id),
    projects: state.projects.filter((p) => p.categoryId !== id),
    tasks: state.tasks.map((t) =>
      t.categoryId === id
        ? { ...t, categoryId: null, projectId: t.projectId !== null && projectIds.has(t.projectId) ? null : t.projectId }
        : t,
    ),
    filter: state.filter.kind === "category" && state.filter.categoryId === id ? ALL_TASKS : state.filter,
  };
}

export function removeProjectLocally(state: TodoState, id: number): TodoState {
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    tasks: state.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    filter:
      state.filter.kind === "category" && state.filter.projectId === id
        ? { ...state.filter, projectId: null }
        : state.filter,
  };
}
