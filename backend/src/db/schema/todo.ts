import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { TODO_COLORS, TODO_SOURCES } from "../../shared/todo";
import { users } from "./auth";

export const todoCategories = sqliteTable(
  "todo_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color", { enum: TODO_COLORS }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("todo_categories_user").on(table.userId),
    uniqueIndex("todo_categories_system").on(table.userId).where(sql`${table.isSystem} = 1`),
    check("todo_category_is_system", sql`${table.isSystem} IN (0, 1)`),
  ],
);

export const todoProjects = sqliteTable(
  "todo_projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => todoCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    source: text("source", { enum: TODO_SOURCES }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("todo_projects_category").on(table.categoryId),
    uniqueIndex("todo_projects_source").on(table.userId, table.source).where(sql`${table.source} IS NOT NULL`),
  ],
);

export const todoTasks = sqliteTable(
  "todo_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    categoryId: integer("category_id").references(() => todoCategories.id, { onDelete: "set null" }),
    projectId: integer("project_id").references(() => todoProjects.id, { onDelete: "set null" }),
    archivedCategoryName: text("archived_category_name"),
    archivedCategoryColor: text("archived_category_color", { enum: TODO_COLORS }),
    dueDate: text("due_date"),
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
    position: real("position").notNull(),
    sourceModule: text("source_module", { enum: TODO_SOURCES }),
    sourceId: integer("source_id"),
    sourcePreviousStatus: text("source_previous_status"),
    createdAt: text("created_at").notNull(),
    lastEditedAt: text("last_edited_at").notNull(),
    completedAt: text("completed_at"),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("todo_tasks_user_open").on(table.userId, table.completedAt, table.position),
    index("todo_tasks_user_completed").on(table.userId, table.completedAt),
    uniqueIndex("todo_tasks_source")
      .on(table.userId, table.sourceModule, table.sourceId)
      .where(sql`${table.sourceModule} IS NOT NULL`),
    check("todo_task_flagged", sql`${table.flagged} IN (0, 1)`),
    check(
      "todo_task_source",
      sql`(${table.sourceModule} IS NULL AND ${table.sourceId} IS NULL) OR (${table.sourceModule} IS NOT NULL AND ${table.sourceId} IS NOT NULL)`,
    ),
  ],
);

export const todoSubtasks = sqliteTable(
  "todo_subtasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => todoTasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    position: real("position").notNull(),
  },
  (table) => [index("todo_subtasks_task").on(table.taskId), check("todo_subtask_done", sql`${table.done} IN (0, 1)`)],
);

export const todoHiddenLinks = sqliteTable(
  "todo_hidden_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    sourceModule: text("source_module", { enum: TODO_SOURCES }).notNull(),
    sourceId: integer("source_id").notNull(),
    hiddenAt: text("hidden_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("todo_hidden_links_source").on(table.userId, table.sourceModule, table.sourceId)],
);
