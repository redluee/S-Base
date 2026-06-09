import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  userId: integer("user_id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  pswdHash: text("pswd_hash").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const modules = sqliteTable("modules", {
  moduleId: integer("module_id").primaryKey({ autoIncrement: true }),
  moduleName: text("module_name").notNull().unique(),
  moduleAlias: text("module_alias").unique(),
  description: text("description"),
});

export const usermodulepermissions = sqliteTable(
  "usermodulepermissions",
  {
    userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull().references(() => modules.moduleId, { onDelete: "cascade" }),
    grantedAt: text("granted_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.moduleId] }),
    userIdx: index("idx_user_permissions").on(table.userId),
    moduleIdx: index("idx_module_permissions").on(table.moduleId),
  }),
);

export const sessions = sqliteTable("sessions", {
  sessionId: text("session_id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
