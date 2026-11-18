import { and, asc, count, desc, eq, inArray, isNotNull, isNull, min } from "drizzle-orm";
import { moduleNamesByUser } from "../../auth/modules";
import db from "../../db/client";
import { todoCategories, todoProjects, todoSubtasks, todoTasks } from "../../db/schema";
import {
  positionBefore,
  SOURCE_PROJECT_NAMES,
  SYSTEM_CATEGORY_COLOR,
  SYSTEM_CATEGORY_NAME,
  TODO_SOURCES,
  type TodoSource,
} from "../../shared/todo";
import type { TodoCategory, TodoHistoryTask, TodoProject, TodoSubtask, TodoTask } from "../../types/todo";
import { NotFoundError } from "../../utils/errors";

export type TaskRow = typeof todoTasks.$inferSelect;

export const nowIso = () => new Date().toISOString();

export const openTask = (userId: number) =>
  and(eq(todoTasks.userId, userId), isNull(todoTasks.completedAt), isNull(todoTasks.deletedAt));

export const completedTask = (userId: number) =>
  and(eq(todoTasks.userId, userId), isNotNull(todoTasks.completedAt), isNull(todoTasks.deletedAt));

export function findTaskRow(userId: number, id: number, { includeDeleted = false } = {}): TaskRow {
  const row = db
    .select()
    .from(todoTasks)
    .where(and(eq(todoTasks.id, id), eq(todoTasks.userId, userId)))
    .get();
  if (!row || (row.deletedAt && !includeDeleted)) throw new NotFoundError("todo.taskNotFound");
  return row;
}

export function subtasksFor(taskIds: number[]): Map<number, TodoSubtask[]> {
  const map = new Map<number, TodoSubtask[]>();
  if (taskIds.length === 0) return map;
  const rows = db
    .select({
      id: todoSubtasks.id,
      taskId: todoSubtasks.taskId,
      title: todoSubtasks.title,
      done: todoSubtasks.done,
      position: todoSubtasks.position,
    })
    .from(todoSubtasks)
    .where(inArray(todoSubtasks.taskId, taskIds))
    .orderBy(asc(todoSubtasks.position), asc(todoSubtasks.id))
    .all();
  for (const row of rows) map.set(row.taskId, [...(map.get(row.taskId) ?? []), row]);
  return map;
}

export function toTask(row: TaskRow, subtasks: TodoSubtask[] = []): TodoTask {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.categoryId,
    projectId: row.projectId,
    dueDate: row.dueDate,
    flagged: row.flagged,
    notes: row.notes,
    position: row.position,
    createdAt: row.createdAt,
    lastEditedAt: row.lastEditedAt,
    completedAt: row.completedAt,
    link: row.sourceModule && row.sourceId !== null ? { module: row.sourceModule, id: row.sourceId } : null,
    subtasks,
  };
}

export function hydrateTasks(rows: TaskRow[]): TodoTask[] {
  const subtasks = subtasksFor(rows.map((r) => r.id));
  return rows.map((row) => toTask(row, subtasks.get(row.id)));
}

export function loadTask(userId: number, id: number): TodoTask {
  return hydrateTasks([findTaskRow(userId, id)])[0];
}

export function hydrateHistory(userId: number, rows: TaskRow[]): TodoHistoryTask[] {
  const categories = new Map(listCategories(userId).map((c) => [c.id, c]));
  return hydrateTasks(rows).map((task, i) => {
    const row = rows[i];
    const category = task.categoryId === null ? undefined : categories.get(task.categoryId);
    return {
      ...task,
      completedAt: row.completedAt ?? row.lastEditedAt,
      categoryName: category?.name ?? row.archivedCategoryName,
      categoryColor: category?.color ?? row.archivedCategoryColor,
    };
  });
}

export function listOpenRows(userId: number): TaskRow[] {
  return db.select().from(todoTasks).where(openTask(userId)).orderBy(asc(todoTasks.position), asc(todoTasks.id)).all();
}

export function recentCompletedRows(userId: number, limit: number): TaskRow[] {
  return db
    .select()
    .from(todoTasks)
    .where(completedTask(userId))
    .orderBy(desc(todoTasks.completedAt), desc(todoTasks.id))
    .limit(limit)
    .all();
}

export function completedCount(userId: number): number {
  return db.select({ n: count() }).from(todoTasks).where(completedTask(userId)).get()?.n ?? 0;
}

export function topPosition(userId: number): number {
  const first = db
    .select({ position: min(todoTasks.position) })
    .from(todoTasks)
    .where(openTask(userId))
    .get();
  return positionBefore(first?.position ?? null);
}

export function touchTask(taskId: number, at = nowIso()): void {
  db.update(todoTasks).set({ lastEditedAt: at }).where(eq(todoTasks.id, taskId)).run();
}

export function listCategories(userId: number): TodoCategory[] {
  return db
    .select({
      id: todoCategories.id,
      name: todoCategories.name,
      color: todoCategories.color,
      sortOrder: todoCategories.sortOrder,
      isSystem: todoCategories.isSystem,
    })
    .from(todoCategories)
    .where(eq(todoCategories.userId, userId))
    .orderBy(asc(todoCategories.sortOrder), asc(todoCategories.id))
    .all();
}

export function listProjects(userId: number): TodoProject[] {
  return db
    .select({
      id: todoProjects.id,
      categoryId: todoProjects.categoryId,
      name: todoProjects.name,
      sortOrder: todoProjects.sortOrder,
      source: todoProjects.source,
    })
    .from(todoProjects)
    .where(eq(todoProjects.userId, userId))
    .orderBy(asc(todoProjects.sortOrder), asc(todoProjects.id))
    .all();
}

export function accessibleSources(userId: number): TodoSource[] {
  const names = moduleNamesByUser([userId]).get(userId) ?? [];
  return TODO_SOURCES.filter((source) => names.includes(source));
}

export interface SystemCategory {
  category: TodoCategory;
  projects: Partial<Record<TodoSource, TodoProject>>;
}

export function ensureSystemCategory(userId: number): SystemCategory {
  return db.transaction((tx) => {
    let category = tx
      .select()
      .from(todoCategories)
      .where(and(eq(todoCategories.userId, userId), eq(todoCategories.isSystem, true)))
      .get();
    if (!category) {
      const last = tx
        .select({ sortOrder: todoCategories.sortOrder })
        .from(todoCategories)
        .where(eq(todoCategories.userId, userId))
        .orderBy(desc(todoCategories.sortOrder))
        .get();
      category = tx
        .insert(todoCategories)
        .values({
          userId,
          name: SYSTEM_CATEGORY_NAME,
          color: SYSTEM_CATEGORY_COLOR,
          sortOrder: (last?.sortOrder ?? -1) + 1,
          isSystem: true,
        })
        .returning()
        .get();
    }
    const projects: Partial<Record<TodoSource, TodoProject>> = {};
    for (const [index, source] of accessibleSources(userId).entries()) {
      let project = tx
        .select()
        .from(todoProjects)
        .where(and(eq(todoProjects.userId, userId), eq(todoProjects.source, source)))
        .get();
      project ??= tx
        .insert(todoProjects)
        .values({ userId, categoryId: category.id, name: SOURCE_PROJECT_NAMES[source], sortOrder: index, source })
        .returning()
        .get();
      projects[source] = {
        id: project.id,
        categoryId: project.categoryId,
        name: project.name,
        sortOrder: project.sortOrder,
        source: project.source,
      };
    }
    return {
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        sortOrder: category.sortOrder,
        isSystem: category.isSystem,
      },
      projects,
    };
  });
}
