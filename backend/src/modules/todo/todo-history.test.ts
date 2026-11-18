import { beforeEach, describe, expect, it } from "bun:test";
import db from "../../db/client";
import { todoCategories, todoProjects, todoSubtasks, todoTasks } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { ValidationError } from "../../utils/errors";
import { TodoService } from "./index";
import { decodeCursor, encodeCursor, pulseDates } from "./todo-history";

let userId: number;
let service: TodoService;

function insertTask(values: Partial<typeof todoTasks.$inferInsert> = {}) {
  return db
    .insert(todoTasks)
    .values({
      userId,
      title: "Taak",
      position: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastEditedAt: "2026-01-01T00:00:00.000Z",
      ...values,
    })
    .returning()
    .get();
}

describe("todo history", () => {
  beforeEach(async () => {
    userId = (await setupTestDb()).adminId;
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
    service = new TodoService();
  });

  it("round-trips cursors and rejects invalid ones", () => {
    expect(decodeCursor(encodeCursor("2026-02-01T10:00:00.000Z", 5))).toEqual({
      completedAt: "2026-02-01T10:00:00.000Z",
      id: 5,
    });
    expect(() => service.history.list(userId, { cursor: "nonsense" })).toThrow(ValidationError);
  });

  it("pages newest first with keyset pagination and skips open and deleted tasks", () => {
    for (let i = 1; i <= 5; i++) insertTask({ title: `T${i}`, completedAt: `2026-03-0${i}T10:00:00.000Z` });
    insertTask({ title: "open" });
    insertTask({ title: "deleted", completedAt: "2026-03-09T10:00:00.000Z", deletedAt: "2026-03-10T10:00:00.000Z" });
    const first = service.history.list(userId, { limit: 2 });
    expect(first.items.map((i) => i.title)).toEqual(["T5", "T4"]);
    expect(first.nextCursor).not.toBeNull();
    const second = service.history.list(userId, { limit: 2, cursor: first.nextCursor ?? "" });
    expect(second.items.map((i) => i.title)).toEqual(["T3", "T2"]);
    const third = service.history.list(userId, { limit: 2, cursor: second.nextCursor ?? "" });
    expect(third.items.map((i) => i.title)).toEqual(["T1"]);
    expect(third.nextCursor).toBeNull();
  });

  it("breaks completedAt ties on id", () => {
    const at = "2026-03-01T10:00:00.000Z";
    const a = insertTask({ title: "A", completedAt: at });
    const b = insertTask({ title: "B", completedAt: at });
    const page = service.history.list(userId, { limit: 1 });
    expect(page.items[0].id).toBe(b.id);
    const next = service.history.list(userId, { cursor: page.nextCursor ?? "" });
    expect(next.items.map((i) => i.id)).toEqual([a.id]);
  });

  it("searches title and notes case-insensitively and filters by category and project", () => {
    const cat = db
      .insert(todoCategories)
      .values({ userId, name: "Werk", color: "sky", sortOrder: 0 })
      .returning()
      .get();
    const project = db.insert(todoProjects).values({ userId, categoryId: cat.id, name: "P" }).returning().get();
    insertTask({ title: "Boodschappen doen", completedAt: "2026-03-01T10:00:00.000Z" });
    insertTask({
      title: "Rapport",
      notes: "Zie Bijlage",
      categoryId: cat.id,
      projectId: project.id,
      completedAt: "2026-03-02T10:00:00.000Z",
    });
    expect(service.history.list(userId, { q: "BOODSCHAPPEN" }).items).toHaveLength(1);
    expect(service.history.list(userId, { q: "zie bij" }).items.map((i) => i.title)).toEqual(["Rapport"]);
    expect(service.history.list(userId, { categoryId: cat.id }).items).toHaveLength(1);
    expect(service.history.list(userId, { projectId: project.id }).items[0].categoryName).toBe("Werk");
    expect(service.history.list(userId, { q: "nergens" }).items).toEqual([]);
  });

  it("keeps the archived category name and colour after the category is deleted", () => {
    insertTask({
      title: "Oud",
      completedAt: "2026-03-01T10:00:00.000Z",
      archivedCategoryName: "Weg",
      archivedCategoryColor: "coral",
    });
    const [item] = service.history.list(userId, {}).items;
    expect(item).toMatchObject({ categoryName: "Weg", categoryColor: "coral" });
  });

  it("builds a zero-filled 365 day pulse ending today", () => {
    insertTask({ completedAt: new Date().toISOString() });
    insertTask({ completedAt: new Date().toISOString() });
    insertTask({ completedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    insertTask({ completedAt: new Date(Date.now() - 400 * 86_400_000).toISOString() });
    const pulse = service.history.pulse(userId, {});
    expect(pulse).toHaveLength(365);
    expect(pulse[364].count).toBe(2);
    expect(pulse[361].count).toBe(1);
    expect(pulse.reduce((sum, p) => sum + p.count, 0)).toBe(3);
    expect(pulse[0].date < pulse[364].date).toBe(true);
    expect(pulseDates("2026-03-01", 3)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });

  it("restores to the top without touching lastEditedAt", () => {
    insertTask({ title: "Open", position: 5 });
    const done = insertTask({ title: "Klaar", position: 9, completedAt: "2026-03-01T10:00:00.000Z" });
    db.insert(todoSubtasks).values({ taskId: done.id, title: "sub", position: 0, done: true }).run();
    const restored = service.history.restore(userId, done.id);
    expect(restored.completedAt).toBeNull();
    expect(restored.position).toBe(4);
    expect(restored.lastEditedAt).toBe(done.lastEditedAt);
    expect(restored.subtasks).toHaveLength(1);
    expect(() => service.history.restore(userId, done.id)).toThrow(ValidationError);
  });

  it("reverts the linked source on restore and clears the previous status", () => {
    const calls: string[] = [];
    service.history.links.onRevert = (ref) => {
      calls.push(`${ref.sourceModule}:${ref.sourceId}:${ref.sourcePreviousStatus}`);
    };
    const linked = insertTask({
      completedAt: "2026-03-01T10:00:00.000Z",
      sourceModule: "cashflow",
      sourceId: 3,
      sourcePreviousStatus: "sent",
    });
    service.history.restore(userId, linked.id);
    expect(calls).toEqual(["cashflow:3:sent"]);
    const after = db
      .select()
      .from(todoTasks)
      .all()
      .find((r) => r.id === linked.id);
    expect(after?.sourcePreviousStatus).toBeNull();
  });
});
