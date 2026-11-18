import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import db from "../../db/client";
import { todoCategories, todoProjects, todoTasks } from "../../db/schema";
import { TODO_NAME_MAX, type TodoColor } from "../../shared/todo";
import type { TodoCategory, TodoCategoryRemoval, TodoProject } from "../../types/todo";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { ensureSystemCategory, listCategories, listProjects, openTask } from "./todo-records";

type CategoryRow = typeof todoCategories.$inferSelect;
type ProjectRow = typeof todoProjects.$inferSelect;

function cleanName(value: string): string {
  const name = value.replace(/\s+/g, " ").trim();
  if (!name) throw new ValidationError("todo.nameRequired");
  if (name.length > TODO_NAME_MAX) throw new ValidationError("todo.nameTooLong");
  return name;
}

function toCategory(row: CategoryRow): TodoCategory {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sortOrder, isSystem: row.isSystem };
}

function toProject(row: ProjectRow): TodoProject {
  return { id: row.id, categoryId: row.categoryId, name: row.name, sortOrder: row.sortOrder, source: row.source };
}

function findCategoryRow(userId: number, id: number): CategoryRow {
  const row = db
    .select()
    .from(todoCategories)
    .where(and(eq(todoCategories.id, id), eq(todoCategories.userId, userId)))
    .get();
  if (!row) throw new NotFoundError("todo.categoryNotFound");
  return row;
}

function findProjectRow(userId: number, id: number): ProjectRow {
  const row = db
    .select()
    .from(todoProjects)
    .where(and(eq(todoProjects.id, id), eq(todoProjects.userId, userId)))
    .get();
  if (!row) throw new NotFoundError("todo.projectNotFound");
  return row;
}

function isExactSet(ids: number[], expected: number[]): boolean {
  const unique = new Set(ids);
  return unique.size === ids.length && ids.length === expected.length && expected.every((id) => unique.has(id));
}

export class TodoCategories {
  list(userId: number): TodoCategory[] {
    return listCategories(userId);
  }

  listProjects(userId: number): TodoProject[] {
    return listProjects(userId);
  }

  ensureSystem(userId: number): TodoCategory {
    return ensureSystemCategory(userId).category;
  }

  create(userId: number, input: { name: string; color: TodoColor }): TodoCategory {
    const name = cleanName(input.name);
    const last = db
      .select({ sortOrder: todoCategories.sortOrder })
      .from(todoCategories)
      .where(eq(todoCategories.userId, userId))
      .orderBy(desc(todoCategories.sortOrder))
      .get();
    const row = db
      .insert(todoCategories)
      .values({ userId, name, color: input.color, sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning()
      .get();
    return toCategory(row);
  }

  update(userId: number, id: number, patch: { name?: string; color?: TodoColor }): TodoCategory {
    const row = findCategoryRow(userId, id);
    const changes: Partial<CategoryRow> = {};
    if (patch.name !== undefined) {
      const name = cleanName(patch.name);
      if (row.isSystem && name !== row.name) throw new ValidationError("todo.systemCategoryLocked");
      changes.name = name;
    }
    if (patch.color !== undefined) changes.color = patch.color;
    if (Object.keys(changes).length === 0) return toCategory(row);
    return toCategory(db.update(todoCategories).set(changes).where(eq(todoCategories.id, id)).returning().get());
  }

  reorder(userId: number, ids: number[]): TodoCategory[] {
    const existing = listCategories(userId).map((c) => c.id);
    if (!isExactSet(ids, existing)) throw new ValidationError("todo.invalidOrder");
    db.transaction((tx) => {
      for (const [sortOrder, id] of ids.entries()) {
        tx.update(todoCategories).set({ sortOrder }).where(eq(todoCategories.id, id)).run();
      }
    });
    return listCategories(userId);
  }

  remove(userId: number, id: number): TodoCategoryRemoval {
    const row = findCategoryRow(userId, id);
    if (row.isSystem) throw new ValidationError("todo.systemCategoryLocked");
    return db.transaction((tx) => {
      const moved = tx
        .update(todoTasks)
        .set({ categoryId: null, projectId: null })
        .where(and(openTask(userId), eq(todoTasks.categoryId, id)))
        .returning({ id: todoTasks.id })
        .all();
      tx.update(todoTasks)
        .set({ archivedCategoryName: row.name, archivedCategoryColor: row.color })
        .where(and(eq(todoTasks.userId, userId), eq(todoTasks.categoryId, id), isNotNull(todoTasks.completedAt)))
        .run();
      tx.update(todoTasks)
        .set({ categoryId: null, projectId: null })
        .where(and(eq(todoTasks.userId, userId), eq(todoTasks.categoryId, id), isNull(todoTasks.completedAt)))
        .run();
      tx.delete(todoCategories).where(eq(todoCategories.id, id)).run();
      return { success: true as const, uncategorised: moved.length };
    });
  }

  createProject(userId: number, input: { categoryId: number; name: string }): TodoProject {
    const category = findCategoryRow(userId, input.categoryId);
    if (category.isSystem) throw new ValidationError("todo.systemCategoryLocked");
    const name = cleanName(input.name);
    const last = db
      .select({ sortOrder: todoProjects.sortOrder })
      .from(todoProjects)
      .where(eq(todoProjects.categoryId, category.id))
      .orderBy(desc(todoProjects.sortOrder))
      .get();
    const row = db
      .insert(todoProjects)
      .values({ userId, categoryId: category.id, name, sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning()
      .get();
    return toProject(row);
  }

  updateProject(userId: number, id: number, patch: { name: string }): TodoProject {
    const row = findProjectRow(userId, id);
    if (row.source) throw new ValidationError("todo.systemProjectLocked");
    const name = cleanName(patch.name);
    return toProject(db.update(todoProjects).set({ name }).where(eq(todoProjects.id, id)).returning().get());
  }

  reorderProjects(userId: number, categoryId: number, ids: number[]): TodoProject[] {
    findCategoryRow(userId, categoryId);
    const existing = listProjects(userId)
      .filter((p) => p.categoryId === categoryId)
      .map((p) => p.id);
    if (!isExactSet(ids, existing)) throw new ValidationError("todo.invalidOrder");
    db.transaction((tx) => {
      for (const [sortOrder, id] of ids.entries()) {
        tx.update(todoProjects).set({ sortOrder }).where(eq(todoProjects.id, id)).run();
      }
    });
    return listProjects(userId).filter((p) => p.categoryId === categoryId);
  }

  removeProject(userId: number, id: number): { success: true } {
    const row = findProjectRow(userId, id);
    if (row.source) throw new ValidationError("todo.systemProjectLocked");
    db.transaction((tx) => {
      tx.update(todoTasks)
        .set({ projectId: null })
        .where(and(eq(todoTasks.userId, userId), eq(todoTasks.projectId, id)))
        .run();
      tx.delete(todoProjects).where(eq(todoProjects.id, id)).run();
    });
    return { success: true };
  }
}
