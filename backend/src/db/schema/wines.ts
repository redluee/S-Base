import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const wines = sqliteTable("wines", {
  wineId: integer("wine_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  type: text("type").notNull(),
  variety: text("variety").notNull(),
  vintage: integer("vintage"),
  countryRegion: text("country_region"),
  rating: integer("rating"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
