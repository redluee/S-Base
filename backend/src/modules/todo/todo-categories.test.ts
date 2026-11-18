import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoTasks } from "../../db/schema";
import { TODO_NAME_MAX } from "../../shared/todo";
import { setupTestDb } from "../../test-utils";
import { TodoCategories } from "./todo-categories";
import { ensureSystemCategory, hydrateHistory, nowIso } from "./todo-records";

const categories = new TodoCategories();
let userId: number;
let otherId: number;

function insertTask(values: Partial<typeof todoTasks.$inferInsert> = {}) {
  const at = nowIso();
  return db
    .insert(todoTasks)
    .values({ userId, title: "Taak", position: 0, createdAt: at, lastEditedAt: at, ...values })
    .returning()
    .get();
}

function taskRow(id: number) {
  return db.select().from(todoTasks).where(eq(todoTasks.id, id)).get();
}

describe("todo categories", () => {
  beforeEach(async () => {
    const ids = await setupTestDb();
    userId = ids.adminId;
    otherId = ids.testerId;
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
  });

  it("creates categories at the end with a trimmed name", () => {
    const system = categories.ensureSystem(userId);
    const work = categories.create(userId, { name: "  Werk  ", color: "blue" });
    const home = categories.create(userId, { name: "Thuis", color: "pink" });
    expect(work).toMatchObject({ name: "Werk", color: "blue", isSystem: false, sortOrder: system.sortOrder + 1 });
    expect(home.sortOrder).toBe(work.sortOrder + 1);
    expect(categories.list(userId).map((c) => c.name)).toEqual(["Automatisch", "Werk", "Thuis"]);
  });

  it("validates names", () => {
    expect(() => categories.create(userId, { name: "   ", color: "blue" })).toThrow("todo.nameRequired");
    expect(() => categories.create(userId, { name: "x".repeat(TODO_NAME_MAX + 1), color: "blue" })).toThrow(
      "todo.nameTooLong",
    );
    const work = categories.create(userId, { name: "Werk", color: "blue" });
    expect(() => categories.update(userId, work.id, { name: "" })).toThrow("todo.nameRequired");
  });

  it("updates name and colour, scoped to the user", () => {
    const work = categories.create(userId, { name: "Werk", color: "blue" });
    expect(categories.update(userId, work.id, { name: "Baan", color: "teal" })).toMatchObject({
      name: "Baan",
      color: "teal",
    });
    expect(() => categories.update(otherId, work.id, { color: "pink" })).toThrow("todo.categoryNotFound");
  });

  it("locks the system category except for its colour", () => {
    const { category, projects } = ensureSystemCategory(userId);
    expect(categories.update(userId, category.id, { color: "amber" }).color).toBe("amber");
    expect(() => categories.update(userId, category.id, { name: "Anders" })).toThrow("todo.systemCategoryLocked");
    expect(() => categories.remove(userId, category.id)).toThrow("todo.systemCategoryLocked");
    expect(() => categories.createProject(userId, { categoryId: category.id, name: "X" })).toThrow(
      "todo.systemCategoryLocked",
    );
    const source = projects.cashflow?.id ?? 0;
    expect(() => categories.updateProject(userId, source, { name: "X" })).toThrow("todo.systemProjectLocked");
    expect(() => categories.removeProject(userId, source)).toThrow("todo.systemProjectLocked");
    expect(
      categories.reorderProjects(userId, category.id, [projects.minor?.id ?? 0, source]).map((p) => p.name),
    ).toEqual(["Minor", "Cashflow"]);
  });

  it("reorders exactly the user's categories, including the system one", () => {
    const system = categories.ensureSystem(userId);
    const a = categories.create(userId, { name: "A", color: "blue" });
    const b = categories.create(userId, { name: "B", color: "pink" });
    expect(categories.reorder(userId, [b.id, system.id, a.id]).map((c) => c.name)).toEqual(["B", "Automatisch", "A"]);
    expect(() => categories.reorder(userId, [b.id, a.id])).toThrow("todo.invalidOrder");
    expect(() => categories.reorder(userId, [b.id, a.id, a.id])).toThrow("todo.invalidOrder");
    expect(() => categories.reorder(userId, [b.id, system.id, a.id, 99999])).toThrow("todo.invalidOrder");
  });

  it("removes a category: open tasks become uncategorised, history keeps name and colour", () => {
    const work = categories.create(userId, { name: "Werk", color: "coral" });
    const project = categories.createProject(userId, { categoryId: work.id, name: "Klus" });
    const open = insertTask({ categoryId: work.id, projectId: project.id });
    const open2 = insertTask({ categoryId: work.id });
    const done = insertTask({ categoryId: work.id, projectId: project.id, completedAt: nowIso() });
    const other = categories.create(userId, { name: "Thuis", color: "blue" });
    const untouched = insertTask({ categoryId: other.id });

    expect(categories.remove(userId, work.id)).toEqual({ success: true, uncategorised: 2 });
    expect(taskRow(open.id)).toMatchObject({ categoryId: null, projectId: null, archivedCategoryName: null });
    expect(taskRow(open2.id)?.categoryId).toBeNull();
    const archived = taskRow(done.id);
    expect(archived).toMatchObject({ categoryId: null, projectId: null, archivedCategoryName: "Werk" });
    expect(archived?.archivedCategoryColor).toBe("coral");
    if (archived) expect(hydrateHistory(userId, [archived])[0]).toMatchObject({ categoryName: "Werk" });
    expect(taskRow(untouched.id)?.categoryId).toBe(other.id);
    expect(categories.listProjects(userId).some((p) => p.id === project.id)).toBe(false);
    expect(() => categories.remove(userId, work.id)).toThrow("todo.categoryNotFound");
  });

  it("manages projects per category", () => {
    const work = categories.create(userId, { name: "Werk", color: "coral" });
    const a = categories.createProject(userId, { categoryId: work.id, name: " Alpha " });
    const b = categories.createProject(userId, { categoryId: work.id, name: "Beta" });
    expect(a).toMatchObject({ name: "Alpha", categoryId: work.id, sortOrder: 0, source: null });
    expect(b.sortOrder).toBe(1);
    expect(categories.updateProject(userId, a.id, { name: "Gamma" }).name).toBe("Gamma");
    expect(categories.reorderProjects(userId, work.id, [b.id, a.id]).map((p) => p.id)).toEqual([b.id, a.id]);
    expect(() => categories.reorderProjects(userId, work.id, [b.id])).toThrow("todo.invalidOrder");
    expect(() => categories.createProject(otherId, { categoryId: work.id, name: "X" })).toThrow(
      "todo.categoryNotFound",
    );
    expect(() => categories.updateProject(otherId, a.id, { name: "X" })).toThrow("todo.projectNotFound");
  });

  it("removes a project: tasks keep their category", () => {
    const work = categories.create(userId, { name: "Werk", color: "coral" });
    const project = categories.createProject(userId, { categoryId: work.id, name: "Klus" });
    const task = insertTask({ categoryId: work.id, projectId: project.id });
    expect(categories.removeProject(userId, project.id)).toEqual({ success: true });
    expect(taskRow(task.id)).toMatchObject({ categoryId: work.id, projectId: null });
    expect(() => categories.removeProject(userId, project.id)).toThrow("todo.projectNotFound");
  });
});
