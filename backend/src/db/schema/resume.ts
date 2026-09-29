import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const resumeProfiles = sqliteTable("resume_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique().references(() => users.userId, { onDelete: "cascade" }),
  fullName: text("full_name").notNull().default(""),
  headline: text("headline").notNull().default(""),
  photoPath: text("photo_path"),
  photoShape: text("photo_shape").notNull().default("circle"),
  residence: text("residence").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  birthDate: text("birth_date").notNull().default(""),
  drivingLicense: text("driving_license").notNull().default(""),
  links: text("links").notNull().default("[]"),
  skills: text("skills").notNull().default("[]"),
  languages: text("languages").notNull().default("[]"),
  hobbies: text("hobbies").notNull().default("[]"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumeExperiences = sqliteTable("resume_experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  company: text("company").notNull(),
  place: text("place").notNull().default(""),
  jobTitle: text("job_title").notNull(),
  startMonth: integer("start_month").notNull(),
  startYear: integer("start_year").notNull(),
  endMonth: integer("end_month"),
  endYear: integer("end_year"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  description: text("description").notNull().default(""),
  logoPath: text("logo_path"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumeEducations = sqliteTable("resume_educations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  place: text("place").notNull().default(""),
  degree: text("degree").notNull(),
  startMonth: integer("start_month").notNull(),
  startYear: integer("start_year").notNull(),
  endMonth: integer("end_month"),
  endYear: integer("end_year"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  description: text("description").notNull().default(""),
  logoPath: text("logo_path"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumes = sqliteTable("resumes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  titleFont: text("title_font").notNull().default("carlito"),
  textFont: text("text_font").notNull().default("carlito"),
  accentColor: text("accent_color").notNull().default("#1f7bc4"),
  leftWidthPct: integer("left_width_pct").notNull().default(70),
  swapColumns: integer("swap_columns", { mode: "boolean" }).notNull().default(false),
  titleScalePct: integer("title_scale_pct").notNull().default(100),
  textScalePct: integer("text_scale_pct").notNull().default(100),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumeItems = sqliteTable("resume_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resumeId: integer("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: integer("ref_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  descriptionOverride: text("description_override"),
});
