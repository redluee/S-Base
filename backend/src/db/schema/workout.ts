import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const workoutTemplates = sqliteTable("workout_templates", {
  templateId: integer("template_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  targetMuscleGroups: text("target_muscle_groups"),
  estimatedTime: integer("estimated_time"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const templateExercises = sqliteTable("template_exercises", {
  templateExerciseId: integer("template_exercise_id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => workoutTemplates.templateId, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  category: text("category").notNull().default("resistance"),
  defaultSets: integer("default_sets").notNull().default(3),
  defaultReps: integer("default_reps").notNull().default(10),
  defaultWeight: real("default_weight"),
  defaultDistance: real("default_distance"),
  defaultDuration: integer("default_duration"),
  defaultRpe: real("default_rpe"),
  defaultHeartRate: integer("default_heart_rate"),
});

export const workoutSessions = sqliteTable("workout_sessions", {
  sessionId: integer("session_id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").references(() => workoutTemplates.templateId, { onDelete: "set null" }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
  notes: text("notes"),
  name: text("name"),
});

export const sessionExercises = sqliteTable("session_exercises", {
  sessionExerciseId: integer("session_exercise_id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => workoutSessions.sessionId, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  category: text("category").notNull().default("resistance"),
});

export const sessionSets = sqliteTable("session_sets", {
  setId: integer("set_id").primaryKey({ autoIncrement: true }),
  sessionExerciseId: integer("session_exercise_id").notNull().references(() => sessionExercises.sessionExerciseId, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weight: real("weight"),
  distance: real("distance"),
  duration: integer("duration"),
  rpe: real("rpe"),
  heartRate: integer("heart_rate"),
  completed: integer("completed").notNull().default(0),
});

