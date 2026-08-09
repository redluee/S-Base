import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const measurements = sqliteTable("measurements", {
  measurementId: integer("measurement_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  height: real("height"), // in cm
  weight: real("weight"), // in kg
  bodyFat: real("body_fat"), // %
  skeletalMuscle: real("skeletal_muscle"), // kg
  fatMass: real("fat_mass"), // kg
  waist: real("waist"), // in cm
  chest: real("chest"), // in cm
  hips: real("hips"), // in cm
  biceps: real("biceps"), // in cm
  thighs: real("thighs"), // in cm
  shoulders: real("shoulders"), // in cm
  neck: real("neck"), // in cm
  calves: real("calves"), // in cm
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const measurementPhotos = sqliteTable("measurement_photos", {
  photoId: integer("photo_id").primaryKey({ autoIncrement: true }),
  measurementId: integer("measurement_id").notNull().references(() => measurements.measurementId, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
