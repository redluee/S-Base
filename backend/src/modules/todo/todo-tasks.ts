import { and, count, eq } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoProjects, todoTasks } from "../../db/schema";
import { isCalendarDate } from "../../shared/dates";
import {
  isValidTodoTitle,
  normalizeTodoTitle,
  positionBetween,
  rebalancedPositions,
  TODO_NOTES_MAX,
  TODO_TITLE_MAX,
} from "../../shared/todo";
import type { TodoMove, TodoSnapshot, TodoTask, TodoTaskInput, TodoTaskPatch } from "../../types/todo";
import { NotFoundError, ValidationError } from "../../utils/errors";
import type { TodoCategories } from "./todo-categories";
import type { TodoLinks } from "./todo-links";
import {
  completedCount,
  findTaskRow,
  hydrateHistory,
  hydrateTasks,
  listCategories,
  listOpenRows,
  listProjects,
  loadTask,
  nowIso,
  openTask,
  recentCompletedRows,
  type TaskRow,
  topPosition,
} from "./todo-records";
import type { TodoSubtasks } from "./todo-subtasks";

function checkTitle(title: string): string {
  const normalized = normalizeTodoTitle(title);
  if (normalized.length === 0) throw new ValidationError("todo.titleRequired");
  if (!isValidTodoTitle(title)) throw new ValidationError("todo.titleTooLong", { max: TODO_TITLE_MAX });
  return normalized;
}

function checkDate(dueDate: string | null): string | null {
  if (dueDate !== null && !isCalendarDate(dueDate)) throw new ValidationError("todo.invalidDate");
  return dueDate;
}

function checkClassification(
  userId: number,
  categoryId: number | null,
  projectId: number | null,
): { categoryId: number | null; projectId: number | null } {
  if (categoryId !== null) {
    const category = db
      .select()
      .from(todoCategories)
      .where(and(eq(todoCategories.id, categoryId), eq(todoCategories.userId, userId)))
      .get();
    if (!category) throw new NotFoundError("todo.categoryNotFound");
    if (category.isSystem) throw new ValidationError("todo.systemCategoryLocked");
  }
  if (projectId !== null) {
    const project = db
      .select()
      .from(todoProjects)
      .where(and(eq(todoProjects.id, projectId), eq(todoProjects.userId, userId)))
      .get();
    if (!project) throw new NotFoundError("todo.projectNotFound");
    if (categoryId === null) throw new ValidationError("todo.projectNeedsCategory");
    if (project.categoryId !== categoryId) throw new ValidationError("todo.projectCategoryMismatch");
  }
  return { categoryId, projectId };
}

function findOpenRow(userId: number, id: number): TaskRow {
  const row = db
    .select()
    .from(todoTasks)
    .where(and(openTask(userId), eq(todoTasks.id, id)))
    .get();
  if (!row) throw new NotFoundError("todo.taskNotFound");
  return row;
}

export class TodoTasks {
  constructor(
    readonly categories: TodoCategories,
    readonly links: TodoLinks,
    readonly subtasks: TodoSubtasks,
  ) {}

  snapshot(userId: number): TodoSnapshot {
    this.links.sync(userId);
    return {
      tasks: hydrateTasks(listOpenRows(userId)),
      categories: listCategories(userId),
      projects: listProjects(userId),
      completedCount: completedCount(userId),
      recentCompleted: hydrateHistory(userId, recentCompletedRows(userId, 3)),
    };
  }

  openCount(userId: number): number {
    this.links.sync(userId);
    return db.select({ n: count() }).from(todoTasks).where(openTask(userId)).get()?.n ?? 0;
  }

  get(userId: number, id: number): TodoTask {
    return loadTask(userId, id);
  }

  create(userId: number, input: TodoTaskInput): TodoTask {
    const title = checkTitle(input.title);
    const dueDate = checkDate(input.dueDate ?? null);
    const { categoryId, projectId } = checkClassification(userId, input.categoryId ?? null, input.projectId ?? null);
    const at = nowIso();
    const row = db
      .insert(todoTasks)
      .values({
        userId,
        title,
        categoryId,
        projectId,
        dueDate,
        position: topPosition(userId),
        createdAt: at,
        lastEditedAt: at,
      })
      .returning()
      .get();
    return hydrateTasks([row])[0];
  }

  update(userId: number, id: number, patch: TodoTaskPatch): TodoTask {
    const row = findTaskRow(userId, id);
    if (row.completedAt) throw new ValidationError("todo.alreadyCompleted");
    const changes: Partial<typeof todoTasks.$inferInsert> = {};

    if (patch.title !== undefined) {
      const title = checkTitle(patch.title);
      if (row.sourceModule && title !== row.title) throw new ValidationError("todo.linkedFieldLocked");
      changes.title = title;
    }
    if (patch.dueDate !== undefined) {
      const dueDate = checkDate(patch.dueDate);
      if (row.sourceModule && dueDate !== row.dueDate) throw new ValidationError("todo.linkedFieldLocked");
      changes.dueDate = dueDate;
    }
    if (patch.notes !== undefined) {
      if (patch.notes.length > TODO_NOTES_MAX) throw new ValidationError("todo.notesTooLong", { max: TODO_NOTES_MAX });
      changes.notes = patch.notes;
    }
    if (patch.flagged !== undefined) changes.flagged = patch.flagged;

    if (patch.categoryId !== undefined || patch.projectId !== undefined) {
      const categoryId = patch.categoryId === undefined ? row.categoryId : patch.categoryId;
      const categoryChanged = categoryId !== row.categoryId;
      const projectId = patch.projectId === undefined ? (categoryChanged ? null : row.projectId) : patch.projectId;
      if (row.sourceModule) {
        if (categoryId !== row.categoryId || projectId !== row.projectId) {
          throw new ValidationError("todo.linkedFieldLocked");
        }
      } else {
        Object.assign(changes, checkClassification(userId, categoryId, projectId));
      }
    }

    if (Object.keys(changes).length === 0) return hydrateTasks([row])[0];
    const updated = db
      .update(todoTasks)
      .set({ ...changes, lastEditedAt: nowIso() })
      .where(eq(todoTasks.id, id))
      .returning()
      .get();
    return hydrateTasks([updated])[0];
  }

  move(userId: number, id: number, move: TodoMove): TodoTask {
    const moving = findOpenRow(userId, id);
    return db.transaction((tx) => {
      const others = listOpenRows(userId).filter((r) => r.id !== id);
      const anchorId = move.afterId ?? move.beforeId;
      const index = anchorId === null ? -1 : others.findIndex((r) => r.id === anchorId);
      if (anchorId !== null && index === -1) throw new NotFoundError("todo.taskNotFound");

      let position: number | null;
      if (move.afterId !== null) position = positionBetween(others[index].position, others[index + 1]?.position);
      else if (move.beforeId !== null) position = positionBetween(others[index - 1]?.position, others[index].position);
      else position = positionBetween(null, others[0]?.position);

      if (position !== null) {
        tx.update(todoTasks).set({ position }).where(eq(todoTasks.id, id)).run();
      } else {
        const insertAt = move.afterId !== null ? index + 1 : Math.max(0, index);
        const ordered = [...others.slice(0, insertAt), moving, ...others.slice(insertAt)];
        const positions = rebalancedPositions(ordered.length);
        for (const [i, task] of ordered.entries()) {
          tx.update(todoTasks).set({ position: positions[i] }).where(eq(todoTasks.id, task.id)).run();
        }
      }
      return loadTask(userId, id);
    });
  }
}
