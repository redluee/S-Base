import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoProjects, todoSubtasks, todoTasks } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import {
  completedCount,
  ensureSystemCategory,
  hydrateHistory,
  listOpenRows,
  loadTask,
  nowIso,
  topPosition,
} from "./todo-records";

let userId: number;

function insertTask(values: Partial<typeof todoTasks.$inferInsert> = {}) {
  const at = nowIso();
  return db
    .insert(todoTasks)
    .values({ userId, title: "Taak", position: 0, createdAt: at, lastEditedAt: at, ...values })
    .returning()
    .get();
}

describe("todo records", () => {
  beforeEach(async () => {
    userId = (await setupTestDb()).adminId;
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
  });

  it("creates the Automatisch category once, with a project per accessible source", () => {
    const first = ensureSystemCategory(userId);
    const second = ensureSystemCategory(userId);
    expect(first.category).toMatchObject({ name: "Automatisch", isSystem: true });
    expect(second.category.id).toBe(first.category.id);
    expect(first.projects.cashflow?.name).toBe("Cashflow");
    expect(first.projects.minor?.name).toBe("Minor");
    expect(db.select().from(todoProjects).where(eq(todoProjects.userId, userId)).all()).toHaveLength(2);
  });

  it("hydrates tasks with subtasks and links, and orders open tasks by position", () => {
    const a = insertTask({ title: "A", position: 2 });
    insertTask({ title: "B", position: 1, sourceModule: "cashflow", sourceId: 7 });
    insertTask({ title: "C", position: 0, completedAt: nowIso() });
    db.insert(todoSubtasks).values({ taskId: a.id, title: "sub", position: 0 }).run();
    expect(listOpenRows(userId).map((r) => r.title)).toEqual(["B", "A"]);
    expect(loadTask(userId, a.id).subtasks.map((s) => s.title)).toEqual(["sub"]);
    expect(topPosition(userId)).toBe(0);
    expect(completedCount(userId)).toBe(1);
    expect(() => loadTask(userId + 999, a.id)).toThrow("todo.taskNotFound");
  });

  it("keeps the archived category name and colour in history", () => {
    const row = insertTask({ completedAt: nowIso(), archivedCategoryName: "Oud", archivedCategoryColor: "pink" });
    expect(hydrateHistory(userId, [row])[0]).toMatchObject({ categoryName: "Oud", categoryColor: "pink" });
  });
});
