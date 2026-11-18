import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { todoSubtasks, todoTasks } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { nowIso } from "./todo-records";
import { TodoSubtasks } from "./todo-subtasks";

const service = new TodoSubtasks();
let userId: number;
let otherUserId: number;

function insertTask(owner = userId, values: Partial<typeof todoTasks.$inferInsert> = {}) {
  return db
    .insert(todoTasks)
    .values({
      userId: owner,
      title: "Taak",
      position: 0,
      createdAt: "2020-01-01T00:00:00.000Z",
      lastEditedAt: "2020-01-01T00:00:00.000Z",
      ...values,
    })
    .returning()
    .get();
}

const order = (taskId: number) =>
  db
    .select()
    .from(todoSubtasks)
    .where(eq(todoSubtasks.taskId, taskId))
    .all()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.title);

const editedAt = (taskId: number) => db.select().from(todoTasks).where(eq(todoTasks.id, taskId)).get()?.lastEditedAt;

describe("todo subtasks", () => {
  beforeEach(async () => {
    const ids = await setupTestDb();
    userId = ids.adminId;
    otherUserId = ids.testerId;
    db.delete(todoTasks).run();
  });

  it("appends, chains after a subtask and normalises titles", () => {
    const task = insertTask();
    const a = service.create(userId, task.id, { title: "  A  " });
    const c = service.create(userId, task.id, { title: "C" });
    service.create(userId, task.id, { title: "B", afterId: a.id });
    expect(a.title).toBe("A");
    expect(order(task.id)).toEqual(["A", "B", "C"]);
    expect(c.taskId).toBe(task.id);
    expect(editedAt(task.id)).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("validates titles and ownership", () => {
    const task = insertTask();
    const foreign = insertTask(otherUserId);
    expect(() => service.create(userId, task.id, { title: "   " })).toThrow("todo.titleRequired");
    expect(() => service.create(userId, task.id, { title: "x".repeat(201) })).toThrow("todo.titleTooLong");
    expect(() => service.create(userId, foreign.id, { title: "x" })).toThrow("todo.taskNotFound");
    expect(() => service.create(userId, task.id, { title: "x", afterId: 99999 })).toThrow("todo.subtaskNotFound");
    const sub = service.create(userId, task.id, { title: "mine" });
    expect(() => service.update(otherUserId, sub.id, { done: true })).toThrow("todo.subtaskNotFound");
    expect(() => service.remove(otherUserId, sub.id)).toThrow("todo.subtaskNotFound");
    db.update(todoTasks).set({ deletedAt: nowIso() }).where(eq(todoTasks.id, task.id)).run();
    expect(() => service.update(userId, sub.id, { done: true })).toThrow("todo.subtaskNotFound");
  });

  it("updates title and done without completing the parent", () => {
    const task = insertTask();
    const sub = service.create(userId, task.id, { title: "A" });
    expect(service.update(userId, sub.id, { done: true, title: "Nieuw" })).toMatchObject({
      done: true,
      title: "Nieuw",
    });
    expect(db.select().from(todoTasks).where(eq(todoTasks.id, task.id)).get()?.completedAt).toBeNull();
    expect(() => service.update(userId, sub.id, { title: "" })).toThrow("todo.titleRequired");
  });

  it("moves with afterId winning over beforeId, and to the front", () => {
    const task = insertTask();
    const [a, b, c] = ["A", "B", "C"].map((title) => service.create(userId, task.id, { title }));
    service.move(userId, c.id, { afterId: null, beforeId: a.id });
    expect(order(task.id)).toEqual(["C", "A", "B"]);
    service.move(userId, c.id, { afterId: a.id, beforeId: null });
    expect(order(task.id)).toEqual(["A", "C", "B"]);
    service.move(userId, b.id, { afterId: a.id, beforeId: c.id });
    expect(order(task.id)).toEqual(["A", "B", "C"]);
    service.move(userId, b.id, { afterId: null, beforeId: null });
    expect(order(task.id)).toEqual(["B", "A", "C"]);
    expect(() => service.move(userId, b.id, { afterId: b.id, beforeId: null })).toThrow("todo.subtaskNotFound");
  });

  it("does not count a reorder as an edit, but removal and edits are", () => {
    const task = insertTask();
    const a = service.create(userId, task.id, { title: "A" });
    const b = service.create(userId, task.id, { title: "B" });
    db.update(todoTasks).set({ lastEditedAt: "2020-01-01T00:00:00.000Z" }).run();
    service.move(userId, b.id, { afterId: null, beforeId: a.id });
    expect(editedAt(task.id)).toBe("2020-01-01T00:00:00.000Z");
    service.remove(userId, a.id);
    expect(editedAt(task.id)).not.toBe("2020-01-01T00:00:00.000Z");
    expect(order(task.id)).toEqual(["B"]);
  });

  it("rebalances when positions run out of room", () => {
    const task = insertTask();
    const a = db.insert(todoSubtasks).values({ taskId: task.id, title: "A", position: 0 }).returning().get();
    db.insert(todoSubtasks).values({ taskId: task.id, title: "B", position: 1e-10 }).run();
    service.create(userId, task.id, { title: "X", afterId: a.id });
    expect(order(task.id)).toEqual(["A", "X", "B"]);
  });
});
