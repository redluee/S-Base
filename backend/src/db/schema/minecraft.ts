import { sqliteTable, integer, text, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const mc_servers = sqliteTable("mc_servers", {
  serverId: integer("serverId").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  displayName: text("displayName").notNull(),
  engine: text("engine").notNull(),
  mcVersion: text("mcVersion").notNull(),
  serverDir: text("serverDir").notNull(),
  javaArgs: text("javaArgs"),
  templateId: integer("templateId"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

export const mc_templates = sqliteTable("mc_templates", {
  templateId: integer("templateId").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  engine: text("engine").notNull(),
  mcVersion: text("mcVersion").notNull(),
  javaArgs: text("javaArgs"),
  propertiesJson: text("propertiesJson"),
  notes: text("notes"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

export const mc_template_files = sqliteTable("mc_template_files", {
  fileId: integer("fileId").primaryKey({ autoIncrement: true }),
  templateId: integer("templateId").notNull().references(() => mc_templates.templateId, { onDelete: "cascade" }),
  fileType: text("fileType").notNull(),
  filename: text("filename").notNull(),
  sha256: text("sha256"),
});

export const mc_player_stats = sqliteTable("mc_player_stats", {
  statId: integer("statId").primaryKey({ autoIncrement: true }),
  serverId: integer("serverId").notNull().references(() => mc_servers.serverId, { onDelete: "cascade" }),
  playerUuid: text("playerUuid").notNull(),
  playerName: text("playerName").notNull(),
  firstSeen: text("firstSeen").default(sql`CURRENT_TIMESTAMP`),
  lastSeen: text("lastSeen"),
  totalPlaytime: integer("totalPlaytime").default(0),
}, (t) => ({
  unq: unique().on(t.serverId, t.playerUuid),
}));

export const mc_player_sessions = sqliteTable("mc_player_sessions", {
  sessionId: integer("sessionId").primaryKey({ autoIncrement: true }),
  serverId: integer("serverId").notNull().references(() => mc_servers.serverId, { onDelete: "cascade" }),
  playerUuid: text("playerUuid").notNull(),
  joinedAt: text("joinedAt").notNull(),
  leftAt: text("leftAt"),
});
