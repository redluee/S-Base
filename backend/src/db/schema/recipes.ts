import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const recipes = sqliteTable("recipes", {
  recipeId: integer("recipe_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cookingTime: integer("cooking_time"),
  kitchen: text("kitchen"),
  status: text("status").notNull().default("to try"),
  description: text("description"),
  rating: integer("rating"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ingredients = sqliteTable("ingredients", {
  ingredientId: integer("ingredient_id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const recipeSteps = sqliteTable("recipe_steps", {
  stepId: integer("step_id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.recipeId, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  description: text("description").notNull(),
});

export const recipeIngredients = sqliteTable(
  "recipe_ingredients",
  {
    recipeId: integer("recipe_id").notNull().references(() => recipes.recipeId, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id").notNull().references(() => ingredients.ingredientId, { onDelete: "cascade" }),
    quantity: real("quantity").notNull(),
    unit: text("unit"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.recipeId, table.ingredientId] }),
  }),
);
