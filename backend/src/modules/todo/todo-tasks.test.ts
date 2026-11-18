import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoProjects, todoTasks } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { TodoService } from "./index";
import { ensureSystemCategory, nowIso } from "./todo-records";

const todo = new TodoService();
let userId: number;

function category(name = "Werk") {
  return db.insert(todoCategories).values({ userId, name, color: "blue" }).returning().get();
}

function project(categoryId: number, name = "P") {
  return db.insert(todoProjects).values({ userId, categoryId, name }).returning().get();
}

describe("todo tasks", () => {
  beforeEach(async () => {
    userId = (await setupTestDb()).adminId;
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
  });

  it("creates tasks at the top and normalises the title", () => {
    const a = todo.tasks.create(userId, { title: "  eerste   taak " });
    const b = todo.tasks.create(userId, { title: "tweede" });
    expect(a.title).toBe("eerste taak");
    expect(b.position).toBeLessThan(a.position);
    expect(a.createdAt).toBe(a.lastEditedAt);
    expect(todo.tasks.snapshot(userId).tasks.map((t) => t.id)).toEqual([b.id, a.id]);
    expect(todo.tasks.openCount(userId)).toBe(2);
  });

  it("validates title, date, category and project", () => {
    expect(() => todo.tasks.create(userId, { title: "  " })).toThrow("todo.titleRequired");
    expect(() => todo.tasks.create(userId, { title: "x".repeat(201) })).toThrow("todo.titleTooLong");
    expect(() => todo.tasks.create(userId, { title: "x", dueDate: "2026-02-30" })).toThrow("todo.invalidDate");
    expect(() => todo.tasks.create(userId, { title: "x", categoryId: 99999 })).toThrow("todo.categoryNotFound");
    const system = ensureSystemCategory(userId).category;
    expect(() => todo.tasks.create(userId, { title: "x", categoryId: system.id })).toThrow("todo.systemCategoryLocked");
    const work = category();
    const other = category("Prive");
    const otherProject = project(other.id);
    expect(() => todo.tasks.create(userId, { title: "x", projectId: otherProject.id })).toThrow(
      "todo.projectNeedsCategory",
    );
    expect(() => todo.tasks.create(userId, { title: "x", categoryId: work.id, projectId: otherProject.id })).toThrow(
      "todo.projectCategoryMismatch",
    );
  });

  it("updates fields, clears the project on category change and touches lastEditedAt", async () => {
    const work = category();
    const other = category("Prive");
    const workProject = project(work.id);
    const task = todo.tasks.create(userId, { title: "a", categoryId: work.id, projectId: workProject.id });
    await Bun.sleep(5);
    const moved = todo.tasks.update(userId, task.id, { categoryId: other.id });
    expect(moved.projectId).toBeNull();
    expect(moved.lastEditedAt > task.lastEditedAt).toBe(true);
    const flagged = todo.tasks.update(userId, task.id, { flagged: true, notes: "n", dueDate: "2026-12-01" });
    expect(flagged).toMatchObject({ flagged: true, notes: "n", dueDate: "2026-12-01" });
    expect(() => todo.tasks.update(userId, task.id, { notes: "x".repeat(20_001) })).toThrow("todo.notesTooLong");
  });

  it("locks fields of linked tasks and rejects completed ones", () => {
    const system = ensureSystemCategory(userId).category;
    const at = nowIso();
    const linked = db
      .insert(todoTasks)
      .values({
        userId,
        title: "Factuur",
        categoryId: system.id,
        position: 0,
        sourceModule: "cashflow",
        sourceId: 1,
        createdAt: at,
        lastEditedAt: at,
      })
      .returning()
      .get();
    expect(() => todo.tasks.update(userId, linked.id, { title: "anders" })).toThrow("todo.linkedFieldLocked");
    expect(() => todo.tasks.update(userId, linked.id, { dueDate: "2026-12-01" })).toThrow("todo.linkedFieldLocked");
    expect(() => todo.tasks.update(userId, linked.id, { categoryId: null })).toThrow("todo.linkedFieldLocked");
    expect(todo.tasks.update(userId, linked.id, { flagged: true, notes: "x" }).flagged).toBe(true);
    const done = todo.tasks.create(userId, { title: "klaar" });
    db.update(todoTasks).set({ completedAt: nowIso() }).where(eq(todoTasks.id, done.id)).run();
    expect(() => todo.tasks.update(userId, done.id, { flagged: true })).toThrow("todo.alreadyCompleted");
    expect(todo.tasks.get(userId, done.id).id).toBe(done.id);
  });

  it("moves with afterId priority, beforeId and to the top, without touching lastEditedAt", () => {
    const [, , , a] = ["d", "c", "b", "a"].map((title) => todo.tasks.create(userId, { title }));
    const ids = Object.fromEntries(todo.tasks.snapshot(userId).tasks.map((t) => [t.title, t.id]));
    const order = () => todo.tasks.snapshot(userId).tasks.map((t) => t.title);
    expect(order()).toEqual(["a", "b", "c", "d"]);
    todo.tasks.move(userId, ids.a, { afterId: ids.c, beforeId: ids.b });
    expect(order()).toEqual(["b", "c", "a", "d"]);
    todo.tasks.move(userId, ids.d, { afterId: null, beforeId: ids.b });
    expect(order()).toEqual(["d", "b", "c", "a"]);
    const result = todo.tasks.move(userId, ids.a, { afterId: null, beforeId: null });
    expect(order()).toEqual(["a", "d", "b", "c"]);
    expect(result.lastEditedAt).toBe(a.lastEditedAt);
    expect(() => todo.tasks.move(userId, ids.a, { afterId: 99999, beforeId: null })).toThrow("todo.taskNotFound");
  });

  it("rebalances when positions collide", () => {
    const [b, a, c] = ["b", "a", "c"].map((title) => todo.tasks.create(userId, { title }));
    db.update(todoTasks).set({ position: 1 }).where(eq(todoTasks.id, a.id)).run();
    db.update(todoTasks)
      .set({ position: 1 + 1e-12 })
      .where(eq(todoTasks.id, b.id))
      .run();
    todo.tasks.move(userId, c.id, { afterId: a.id, beforeId: null });
    expect(todo.tasks.snapshot(userId).tasks.map((t) => t.title)).toEqual(["a", "c", "b"]);
  });
});
