import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoSubtasks, todoTasks } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { TodoCategories } from "./todo-categories";
import { TodoCompletion } from "./todo-completion";
import { type LinkedTaskRef, TodoLinks } from "./todo-links";
import { nowIso } from "./todo-records";
import { TodoSubtasks } from "./todo-subtasks";
import { TodoTasks } from "./todo-tasks";

class RecordingLinks extends TodoLinks {
  calls: [string, LinkedTaskRef][] = [];

  override onComplete(task: LinkedTaskRef): string | null {
    this.calls.push(["complete", task]);
    return "sent";
  }

  override onRevert(task: LinkedTaskRef): void {
    this.calls.push(["revert", task]);
  }

  override hide(task: LinkedTaskRef): void {
    this.calls.push(["hide", task]);
  }

  override unhide(task: LinkedTaskRef): void {
    this.calls.push(["unhide", task]);
  }
}

let userId: number;
let links: RecordingLinks;
let completion: TodoCompletion;

const EDITED = "2026-01-01T00:00:00.000Z";

function insertTask(values: Partial<typeof todoTasks.$inferInsert> = {}) {
  return db
    .insert(todoTasks)
    .values({ userId, title: "Taak", position: 0, createdAt: EDITED, lastEditedAt: EDITED, ...values })
    .returning()
    .get();
}

const rowOf = (id: number) => db.select().from(todoTasks).where(eq(todoTasks.id, id)).get();

describe("todo completion", () => {
  beforeEach(async () => {
    userId = (await setupTestDb()).adminId;
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
    links = new RecordingLinks();
    const subtasks = new TodoSubtasks();
    completion = new TodoCompletion(new TodoTasks(new TodoCategories(), links, subtasks), links);
  });

  it("completes and uncompletes a task in place without touching lastEditedAt", () => {
    const task = insertTask({ position: 3.5 });
    insertTask({ completedAt: nowIso(), deletedAt: nowIso() });
    const done = completion.complete(userId, task.id);
    expect(done.task.completedAt).not.toBeNull();
    expect(done.task.position).toBe(3.5);
    expect(done.task.lastEditedAt).toBe(EDITED);
    expect(done.completedCount).toBe(1);
    expect(completion.completedCount(userId)).toBe(1);

    const back = completion.uncomplete(userId, task.id);
    expect(back.task.completedAt).toBeNull();
    expect(back.task.position).toBe(3.5);
    expect(back.task.lastEditedAt).toBe(EDITED);
    expect(back.completedCount).toBe(0);
    expect(links.calls).toHaveLength(0);
  });

  it("rejects completing twice and uncompleting an open task", () => {
    const task = insertTask();
    expect(() => completion.uncomplete(userId, task.id)).toThrow("todo.notCompleted");
    completion.complete(userId, task.id);
    expect(() => completion.complete(userId, task.id)).toThrow("todo.alreadyCompleted");
    expect(() => completion.complete(userId + 999, task.id)).toThrow("todo.taskNotFound");
  });

  it("stores the source's previous status and reverts it for linked tasks", () => {
    const task = insertTask({ sourceModule: "cashflow", sourceId: 7 });
    completion.complete(userId, task.id);
    expect(rowOf(task.id)?.sourcePreviousStatus).toBe("sent");
    expect(links.calls[0]).toEqual([
      "complete",
      { userId, sourceModule: "cashflow", sourceId: 7, sourcePreviousStatus: null },
    ]);

    completion.uncomplete(userId, task.id);
    expect(links.calls[1]).toEqual([
      "revert",
      { userId, sourceModule: "cashflow", sourceId: 7, sourcePreviousStatus: "sent" },
    ]);
    expect(rowOf(task.id)?.sourcePreviousStatus).toBeNull();
  });

  it("soft deletes and undeletes a task with its subtasks", () => {
    const task = insertTask({ sourceModule: "minor", sourceId: 2 });
    db.insert(todoSubtasks).values({ taskId: task.id, title: "sub", position: 0 }).run();
    expect(completion.remove(userId, task.id)).toEqual({ success: true });
    expect(rowOf(task.id)?.deletedAt).not.toBeNull();
    expect(() => completion.complete(userId, task.id)).toThrow("todo.taskNotFound");

    const restored = completion.undelete(userId, task.id);
    expect(restored.subtasks.map((s) => s.title)).toEqual(["sub"]);
    expect(rowOf(task.id)?.deletedAt).toBeNull();
    expect(rowOf(task.id)?.lastEditedAt).toBe(EDITED);
    expect(links.calls.map(([kind]) => kind)).toEqual(["hide", "unhide"]);
  });

  it("purges tasks deleted more than a day ago when deleting", () => {
    const old = insertTask({ deletedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString() });
    const recent = insertTask({ deletedAt: new Date(Date.now() - 3600 * 1000).toISOString() });
    const target = insertTask();
    completion.remove(userId, target.id);
    expect(rowOf(old.id)).toBeUndefined();
    expect(rowOf(recent.id)).toBeDefined();
    expect(rowOf(target.id)).toBeDefined();
    expect(() => completion.undelete(userId, old.id)).toThrow("todo.taskNotFound");
  });
});
