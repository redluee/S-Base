import type { todoCategories, todoProjects, todoSubtasks, todoTasks } from "../db/schema/todo";
import type { TodoColor, TodoSource } from "../shared/todo";

type TaskRow = typeof todoTasks.$inferSelect;

export type TodoCategory = Pick<
  typeof todoCategories.$inferSelect,
  "id" | "name" | "color" | "icon" | "sortOrder" | "isSystem"
>;

export type TodoCategoryInput = Pick<TodoCategory, "name" | "color"> & Partial<Pick<TodoCategory, "icon">>;

export type TodoCategoryPatch = Partial<Pick<TodoCategory, "name" | "color" | "icon">>;

export type TodoProject = Pick<typeof todoProjects.$inferSelect, "id" | "categoryId" | "name" | "sortOrder" | "source">;

export type TodoSubtask = Pick<typeof todoSubtasks.$inferSelect, "id" | "taskId" | "title" | "done" | "position">;

export interface TodoLink {
  module: TodoSource;
  id: number;
}

export type TodoTask = Pick<
  TaskRow,
  | "id"
  | "title"
  | "categoryId"
  | "projectId"
  | "dueDate"
  | "flagged"
  | "notes"
  | "position"
  | "createdAt"
  | "lastEditedAt"
  | "completedAt"
> & {
  link: TodoLink | null;
  subtasks: TodoSubtask[];
};

export interface TodoHistoryTask extends TodoTask {
  completedAt: string;
  categoryName: string | null;
  categoryColor: TodoColor | null;
}

export interface TodoSnapshot {
  tasks: TodoTask[];
  categories: TodoCategory[];
  projects: TodoProject[];
  completedCount: number;
  recentCompleted: TodoHistoryTask[];
}

export interface TodoCompletionResult {
  task: TodoTask;
  completedCount: number;
}

export interface TodoHistoryPage {
  items: TodoHistoryTask[];
  nextCursor: string | null;
}

export interface TodoPulsePoint {
  date: string;
  count: number;
}

export interface TodoCategoryRemoval {
  success: true;
  uncategorised: number;
}

export interface TodoTaskInput {
  title: string;
  categoryId?: number | null;
  projectId?: number | null;
  dueDate?: string | null;
}

export interface TodoTaskPatch {
  title?: string;
  categoryId?: number | null;
  projectId?: number | null;
  dueDate?: string | null;
  flagged?: boolean;
  notes?: string;
}

export interface TodoMove {
  afterId: number | null;
  beforeId: number | null;
}

export interface TodoHistoryQuery {
  q?: string;
  categoryId?: number;
  projectId?: number;
  cursor?: string;
  limit?: number;
}

export interface TodoPulseQuery {
  categoryId?: number;
  projectId?: number;
}
