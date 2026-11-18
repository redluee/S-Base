import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { filterPreselection, type TodoFilter } from "./todo-state";

export interface ChipSelection {
  categoryId: number | null;
  projectId: number | null;
}

export const NO_SELECTION: ChipSelection = { categoryId: null, projectId: null };

export function toggleCategory(current: ChipSelection, categoryId: number): ChipSelection {
  return current.categoryId === categoryId ? NO_SELECTION : { categoryId, projectId: null };
}

export function toggleProject(current: ChipSelection, project: Pick<TodoProject, "id" | "categoryId">): ChipSelection {
  if (current.projectId === project.id) return { ...current, projectId: null };
  return { categoryId: project.categoryId, projectId: project.id };
}

export function quickAddPreselection(
  filter: TodoFilter,
  categories: Pick<TodoCategory, "id" | "isSystem">[],
  projects: Pick<TodoProject, "id" | "categoryId">[],
): ChipSelection {
  const { categoryId, projectId } = filterPreselection(filter);
  const category = categories.find((c) => c.id === categoryId);
  if (!category || category.isSystem) return NO_SELECTION;
  const project = projects.find((p) => p.id === projectId && p.categoryId === category.id);
  return { categoryId: category.id, projectId: project?.id ?? null };
}

const shortDate = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function customDateLabel(value: string): string {
  return shortDate.format(new Date(`${value}T12:00:00Z`)).replace(/\./g, "");
}
