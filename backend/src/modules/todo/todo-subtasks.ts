import { asc, eq } from "drizzle-orm";
import db from "../../db/client";
import { todoSubtasks } from "../../db/schema";
import {
  normalizeTodoTitle,
  positionBefore,
  positionBetween,
  rebalancedPositions,
  TODO_TITLE_MAX,
} from "../../shared/todo";
import type { TodoMove, TodoSubtask } from "../../types/todo";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { findTaskRow, touchTask } from "./todo-records";

type SubtaskRow = typeof todoSubtasks.$inferSelect;

function cleanTitle(value: string): string {
  const title = normalizeTodoTitle(value);
  if (!title) throw new ValidationError("todo.titleRequired");
  if (title.length > TODO_TITLE_MAX) throw new ValidationError("todo.titleTooLong");
  return title;
}

function toSubtask(row: SubtaskRow): TodoSubtask {
  return { id: row.id, taskId: row.taskId, title: row.title, done: row.done, position: row.position };
}

function siblings(taskId: number): SubtaskRow[] {
  return db
    .select()
    .from(todoSubtasks)
    .where(eq(todoSubtasks.taskId, taskId))
    .orderBy(asc(todoSubtasks.position), asc(todoSubtasks.id))
    .all();
}

function ownedSubtask(userId: number, id: number): SubtaskRow {
  const row = db.select().from(todoSubtasks).where(eq(todoSubtasks.id, id)).get();
  if (!row) throw new NotFoundError("todo.subtaskNotFound");
  try {
    findTaskRow(userId, row.taskId);
  } catch {
    throw new NotFoundError("todo.subtaskNotFound");
  }
  return row;
}

function rebalance(taskId: number): SubtaskRow[] {
  return db.transaction((tx) => {
    const rows = siblings(taskId);
    const positions = rebalancedPositions(rows.length);
    rows.forEach((row, i) => {
      tx.update(todoSubtasks).set({ position: positions[i] }).where(eq(todoSubtasks.id, row.id)).run();
      row.position = positions[i];
    });
    return rows;
  });
}

function slotPosition(rows: SubtaskRow[], move: TodoMove): number | null {
  if (move.afterId !== null) {
    const index = rows.findIndex((r) => r.id === move.afterId);
    if (index === -1) throw new NotFoundError("todo.subtaskNotFound");
    return positionBetween(rows[index].position, rows[index + 1]?.position);
  }
  if (move.beforeId !== null) {
    const index = rows.findIndex((r) => r.id === move.beforeId);
    if (index === -1) throw new NotFoundError("todo.subtaskNotFound");
    return positionBetween(rows[index - 1]?.position, rows[index].position);
  }
  return positionBefore(rows[0]?.position);
}

function placeAt(taskId: number, others: SubtaskRow[], move: TodoMove): number {
  const direct = slotPosition(others, move);
  if (direct !== null) return direct;
  const ids = new Set(others.map((r) => r.id));
  const rebalanced = rebalance(taskId).filter((r) => ids.has(r.id));
  return slotPosition(rebalanced, move) ?? 0;
}

export class TodoSubtasks {
  create(userId: number, taskId: number, input: { title: string; afterId?: number | null }): TodoSubtask {
    findTaskRow(userId, taskId);
    const title = cleanTitle(input.title);
    const rows = siblings(taskId);
    const afterId = input.afterId ?? null;
    const position =
      afterId === null ? (rows.at(-1)?.position ?? -1) + 1 : placeAt(taskId, rows, { afterId, beforeId: null });
    const row = db.insert(todoSubtasks).values({ taskId, title, position }).returning().get();
    touchTask(taskId);
    return toSubtask(row);
  }

  update(userId: number, id: number, patch: { title?: string; done?: boolean }): TodoSubtask {
    const current = ownedSubtask(userId, id);
    const values: Partial<Pick<SubtaskRow, "title" | "done">> = {};
    if (patch.title !== undefined) values.title = cleanTitle(patch.title);
    if (patch.done !== undefined) values.done = patch.done;
    if (Object.keys(values).length === 0) return toSubtask(current);
    const row = db.update(todoSubtasks).set(values).where(eq(todoSubtasks.id, id)).returning().get();
    touchTask(current.taskId);
    return toSubtask(row);
  }

  move(userId: number, id: number, move: TodoMove): TodoSubtask {
    const current = ownedSubtask(userId, id);
    const others = siblings(current.taskId).filter((r) => r.id !== id);
    const position = placeAt(current.taskId, others, move);
    const row = db.update(todoSubtasks).set({ position }).where(eq(todoSubtasks.id, id)).returning().get();
    return toSubtask(row);
  }

  remove(userId: number, id: number): { success: true } {
    const current = ownedSubtask(userId, id);
    db.delete(todoSubtasks).where(eq(todoSubtasks.id, id)).run();
    touchTask(current.taskId);
    return { success: true };
  }
}
