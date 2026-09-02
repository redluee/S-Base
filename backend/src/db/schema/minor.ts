import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const minorVacations = sqliteTable("minor_vacations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorStoryTypes = sqliteTable("minor_story_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  defaultQualityCriteria: text("default_quality_criteria"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorSprints = sqliteTable("minor_sprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  sprintNumber: text("sprint_number").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  durationDays: integer("duration_days").notNull().default(14),
  showAndGrowDate: text("show_and_grow_date").notNull(),
  extendedDays: integer("extended_days").notNull().default(0),
  extensionReason: text("extension_reason"),
  status: text("status").notNull().default("active"), // planned | active | completed | archived
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorStories = sqliteTable("minor_stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id").references(() => minorSprints.id, { onDelete: "set null" }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  storyTypeCode: text("story_type_code").notNull().default("US"),
  storyNumber: text("story_number"),
  title: text("title").notNull(),
  asA: text("as_a"),
  iWant: text("i_want"),
  soThat: text("so_that"),
  learningOutcomes: text("learning_outcomes").notNull().default("[]"), // JSON string array e.g. "[1,2,5]"
  status: text("status").notNull().default("todo"), // todo | in_progress | done
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorStoryCriteria = sqliteTable("minor_story_criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => minorStories.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // acceptance | quality
  orderIndex: integer("order_index").notNull().default(1),
  indent: integer("indent").notNull().default(0),
  text: text("text").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
});

export const minorStoryEvidence = sqliteTable("minor_story_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => minorStories.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // link | github | document | app
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorSelfEvaluations = sqliteTable("minor_self_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id").notNull().references(() => minorSprints.id, { onDelete: "cascade" }),
  learningOutcome: integer("learning_outcome").notNull(), // 1, 2, 3, 4, 5
  level: text("level").notNull().default("-"), // V | NV | -
  argumentation: text("argumentation"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorTeacherAssessments = sqliteTable("minor_teacher_assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id").notNull().references(() => minorSprints.id, { onDelete: "cascade" }),
  learningOutcome: integer("learning_outcome").notNull(), // 1, 2, 3, 4, 5
  assessment: text("assessment").notNull().default("-"), // V | O | -
  notes: text("notes"),
  evaluatedAt: text("evaluated_at"),
});

export const minorFeedbackEntries = sqliteTable("minor_feedback_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id").notNull().references(() => minorSprints.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  fromWhom: text("from_whom").notNull(),
  feedback: text("feedback").notNull(),
  action: text("action").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorReflections = sqliteTable("minor_reflections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id").notNull().references(() => minorSprints.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  whatLearned: text("what_learned"),
  whatRetained: text("what_retained"),
  whatChange: text("what_change"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const minorPeerHelp = sqliteTable("minor_peer_help", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  sprintId: integer("sprint_id").references(() => minorSprints.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  peerName: text("peer_name").notNull(),
  description: text("description").notNull(),
  links: text("links"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
