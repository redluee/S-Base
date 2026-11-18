import { and, eq, isNotNull, lt } from "drizzle-orm";
import db from "../../db/client";
import { todoTasks } from "../../db/schema";
import type { TodoCompletionResult, TodoTask } from "../../types/todo";
import { ConflictError } from "../../utils/errors";
import type { LinkedTaskRef, TodoLinks } from "./todo-links";
import { completedCount, findTaskRow, loadTask, nowIso, type TaskRow } from "./todo-records";
import type { TodoTasks } from "./todo-tasks";

const PURGE_AFTER_MS = 24 * 60 * 60 * 1000;

function linkRef(row: TaskRow): LinkedTaskRef | null {
  if (!row.sourceModule || row.sourceId === null) return null;
  return {
    userId: row.userId,
    sourceModule: row.sourceModule,
    sourceId: row.sourceId,
    sourcePreviousStatus: row.sourcePreviousStatus,
  };
}

export class TodoCompletion {
  constructor(
    readonly tasks: TodoTasks,
    readonly links: TodoLinks,
  ) {}

  completedCount(userId: number): number {
    return completedCount(userId);
  }

  complete(userId: number, id: number): TodoCompletionResult {
    const row = findTaskRow(userId, id);
    if (row.completedAt) throw new ConflictError("todo.alreadyCompleted");
    const ref = linkRef(row);
    const sourcePreviousStatus = ref ? this.links.onComplete(ref) : row.sourcePreviousStatus;
    db.update(todoTasks).set({ completedAt: nowIso(), sourcePreviousStatus }).where(eq(todoTasks.id, row.id)).run();
    return this.result(userId, id);
  }

  uncomplete(userId: number, id: number): TodoCompletionResult {
    const row = findTaskRow(userId, id);
    if (!row.completedAt) throw new ConflictError("todo.notCompleted");
    const ref = linkRef(row);
    if (ref) this.links.onRevert(ref);
    db.update(todoTasks).set({ completedAt: null, sourcePreviousStatus: null }).where(eq(todoTasks.id, row.id)).run();
    return this.result(userId, id);
  }

  remove(userId: number, id: number): { success: true } {
    const row = findTaskRow(userId, id);
    const now = new Date();
    const ref = linkRef(row);
    if (ref) this.links.hide(ref);
    db.update(todoTasks).set({ deletedAt: now.toISOString() }).where(eq(todoTasks.id, row.id)).run();
    this.purge(userId, new Date(now.getTime() - PURGE_AFTER_MS).toISOString());
    return { success: true };
  }

  undelete(userId: number, id: number): TodoTask {
    const row = findTaskRow(userId, id, { includeDeleted: true });
    if (row.deletedAt) {
      const ref = linkRef(row);
      if (ref) this.links.unhide(ref);
      db.update(todoTasks).set({ deletedAt: null }).where(eq(todoTasks.id, row.id)).run();
    }
    return loadTask(userId, id);
  }

  private purge(userId: number, before: string): void {
    db.delete(todoTasks)
      .where(and(eq(todoTasks.userId, userId), isNotNull(todoTasks.deletedAt), lt(todoTasks.deletedAt, before)))
      .run();
  }

  private result(userId: number, id: number): TodoCompletionResult {
    return { task: loadTask(userId, id), completedCount: completedCount(userId) };
  }
}
