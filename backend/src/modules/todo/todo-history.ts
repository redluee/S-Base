import { and, desc, eq, like, lt, or, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { todoTasks } from "../../db/schema";
import { today } from "../../shared/dates";
import { normalizeSearchString } from "../../shared/search";
import { HISTORY_PULSE_DAYS } from "../../shared/todo";
import type { TodoHistoryPage, TodoHistoryQuery, TodoPulsePoint, TodoPulseQuery, TodoTask } from "../../types/todo";
import { ValidationError } from "../../utils/errors";
import { sqlNormalize } from "../../utils/search";
import type { TodoLinks } from "./todo-links";
import { completedTask, findTaskRow, hydrateHistory, hydrateTasks, topPosition } from "./todo-records";
import type { TodoSubtasks } from "./todo-subtasks";
import type { TodoTasks } from "./todo-tasks";

const DEFAULT_LIMIT = 30;
const DAY_MS = 86_400_000;

export function encodeCursor(completedAt: string, id: number): string {
  return Buffer.from(`${completedAt}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string): { completedAt: string; id: number } {
  const text = Buffer.from(cursor, "base64url").toString();
  const split = text.lastIndexOf("|");
  const completedAt = text.slice(0, split);
  const id = Number(text.slice(split + 1));
  if (split < 1 || !Number.isInteger(id) || Number.isNaN(Date.parse(completedAt))) {
    throw new ValidationError("todo.invalidCursor");
  }
  return { completedAt, id };
}

function scopeConditions(query: TodoPulseQuery): SQL[] {
  const conditions: SQL[] = [];
  if (query.categoryId !== undefined) conditions.push(eq(todoTasks.categoryId, query.categoryId));
  if (query.projectId !== undefined) conditions.push(eq(todoTasks.projectId, query.projectId));
  return conditions;
}

export function pulseDates(endDate: string, days: number): string[] {
  const end = Date.parse(`${endDate}T12:00:00Z`);
  return Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

export class TodoHistory {
  constructor(
    readonly tasks: TodoTasks,
    readonly links: TodoLinks,
    readonly subtasks: TodoSubtasks,
  ) {}

  list(userId: number, query: TodoHistoryQuery): TodoHistoryPage {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const conditions: (SQL | undefined)[] = [completedTask(userId), ...scopeConditions(query)];
    if (query.q?.trim()) {
      const pattern = `%${normalizeSearchString(query.q)}%`;
      conditions.push(or(like(sqlNormalize(todoTasks.title), pattern), like(sqlNormalize(todoTasks.notes), pattern)));
    }
    if (query.cursor) {
      const { completedAt, id } = decodeCursor(query.cursor);
      conditions.push(
        or(lt(todoTasks.completedAt, completedAt), and(eq(todoTasks.completedAt, completedAt), lt(todoTasks.id, id))),
      );
    }
    const rows = db
      .select()
      .from(todoTasks)
      .where(and(...conditions))
      .orderBy(desc(todoTasks.completedAt), desc(todoTasks.id))
      .limit(limit + 1)
      .all();
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor = rows.length > limit && last?.completedAt ? encodeCursor(last.completedAt, last.id) : null;
    return { items: hydrateHistory(userId, page), nextCursor };
  }

  pulse(userId: number, query: TodoPulseQuery): TodoPulsePoint[] {
    const dates = pulseDates(today(), HISTORY_PULSE_DAYS);
    const rows = db
      .select({ completedAt: todoTasks.completedAt })
      .from(todoTasks)
      .where(and(completedTask(userId), ...scopeConditions(query)))
      .all();
    const counts = new Map(dates.map((date) => [date, 0]));
    for (const { completedAt } of rows) {
      if (!completedAt) continue;
      const date = today(new Date(completedAt));
      const current = counts.get(date);
      if (current !== undefined) counts.set(date, current + 1);
    }
    return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
  }

  restore(userId: number, id: number): TodoTask {
    const row = findTaskRow(userId, id);
    if (!row.completedAt) throw new ValidationError("todo.notCompleted");
    if (row.sourceModule && row.sourceId !== null && row.sourcePreviousStatus !== null) {
      this.links.onRevert({
        userId,
        sourceModule: row.sourceModule,
        sourceId: row.sourceId,
        sourcePreviousStatus: row.sourcePreviousStatus,
      });
    }
    const restored = db
      .update(todoTasks)
      .set({ completedAt: null, sourcePreviousStatus: null, position: topPosition(userId) })
      .where(eq(todoTasks.id, id))
      .returning()
      .get();
    return hydrateTasks([restored])[0];
  }
}
