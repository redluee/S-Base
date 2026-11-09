import { and, asc, desc, eq, like, or, type SQL, sql } from "drizzle-orm";
import db from "../../db/client";
import { ingredients, recipeIngredients, recipeSteps, recipes } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";
import { isRecipeStatus } from "./recipes-constants";
import type { IngredientInput, RecipeIngredients, StepInput } from "./recipes-ingredients";

export interface RecipeInput {
  name?: string;
  cookingTime?: number;
  kitchen?: string;
  status?: string;
  description?: string;
  rating?: number;
  ingredients?: IngredientInput[];
  steps?: StepInput[];
}

export interface RecipeListQuery {
  q?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

const SORT_COLUMNS = {
  name: recipes.name,
  rating: recipes.rating,
  cookingTime: recipes.cookingTime,
} as const;

export class RecipeCatalog {
  constructor(private readonly ingredients: RecipeIngredients) {}

  list({ q, status, sortBy, sortOrder }: RecipeListQuery) {
    const column = SORT_COLUMNS[sortBy as keyof typeof SORT_COLUMNS] ?? recipes.name;
    const orderFn = sortOrder === "desc" ? desc : asc;
    const conditions: SQL[] = [];
    if (q) conditions.push(this.searchCondition(q));
    if (isRecipeStatus(status)) conditions.push(eq(recipes.status, status));
    return db
      .select()
      .from(recipes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderFn(column))
      .all();
  }

  suggest(q: string) {
    const normalizedQ = normalizeSearchString(q);
    const recipeNames = db
      .select({ name: recipes.name })
      .from(recipes)
      .where(like(sqlNormalize(recipes.name), `%${normalizedQ}%`))
      .limit(5)
      .all()
      .map((r) => ({ type: "recipe" as const, value: r.name }));
    const ingredientNames = db
      .select({ name: ingredients.name })
      .from(ingredients)
      .where(like(sqlNormalize(ingredients.name), `%${normalizedQ}%`))
      .limit(5)
      .all()
      .map((i) => ({ type: "ingredient" as const, value: i.name }));
    const kitchens = db
      .select({ name: recipes.kitchen })
      .from(recipes)
      .where(
        and(
          like(sqlNormalize(recipes.kitchen), `%${normalizedQ}%`),
          sql`${recipes.kitchen} IS NOT NULL`,
          sql`${recipes.kitchen} != ''`,
        ),
      )
      .limit(3)
      .all()
      .map((k) => ({ type: "kitchen" as const, value: k.name ?? "" }));
    return [...recipeNames, ...ingredientNames, ...kitchens];
  }

  getById(id: number) {
    const recipe = this.findRecipe(id);
    const ings = db
      .select({
        ingredientId: ingredients.ingredientId,
        name: ingredients.name,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        isOptional: recipeIngredients.isOptional,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.ingredientId))
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(recipeIngredients.sortOrder)
      .all();
    const steps = db
      .select({ stepId: recipeSteps.stepId, stepNumber: recipeSteps.stepNumber, description: recipeSteps.description })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.stepNumber)
      .all();
    return { ...recipe, ingredients: ings, steps };
  }

  create(data: RecipeInput & { name: string }) {
    this.assertValid(data);
    const recipe = db
      .insert(recipes)
      .values({
        name: data.name,
        cookingTime: data.cookingTime,
        kitchen: data.kitchen,
        status: data.status ?? "to try",
        description: data.description,
        rating: data.rating,
      })
      .returning()
      .get();
    this.writeChildren(recipe.recipeId, data);
    return this.getById(recipe.recipeId);
  }

  update(id: number, data: RecipeInput) {
    const existing = this.findRecipe(id);
    this.assertValid(data);
    db.update(recipes)
      .set({
        name: data.name ?? existing.name,
        cookingTime: data.cookingTime ?? existing.cookingTime,
        kitchen: data.kitchen ?? existing.kitchen,
        status: data.status ?? existing.status,
        description: data.description ?? existing.description,
        rating: data.rating ?? existing.rating,
      })
      .where(eq(recipes.recipeId, id))
      .run();
    this.writeChildren(id, data);
    return this.getById(id);
  }

  remove(id: number) {
    this.findRecipe(id);
    db.delete(recipes).where(eq(recipes.recipeId, id)).run();
    return { deleted: true };
  }

  updateStatus(id: number, status: string) {
    if (!isRecipeStatus(status)) throw new ValidationError("recipes.invalidStatus");
    this.findRecipe(id);
    db.update(recipes).set({ status }).where(eq(recipes.recipeId, id)).run();
    return this.getById(id);
  }

  updateRating(id: number, rating: number) {
    if (rating < 0 || rating > 10) throw new ValidationError("recipes.invalidRating");
    this.findRecipe(id);
    db.update(recipes).set({ rating }).where(eq(recipes.recipeId, id)).run();
    return this.getById(id);
  }

  private findRecipe(id: number) {
    const recipe = db.select().from(recipes).where(eq(recipes.recipeId, id)).get();
    if (!recipe) throw new NotFoundError("recipes.notFound");
    return recipe;
  }

  private assertValid(data: RecipeInput) {
    if (data.cookingTime !== undefined && data.cookingTime < 0) throw new ValidationError("recipes.cookingTimeNegative");
    this.ingredients.assertValid(data.ingredients);
  }

  private writeChildren(recipeId: number, data: RecipeInput) {
    if (data.ingredients) this.ingredients.replaceIngredients(recipeId, data.ingredients);
    if (data.steps) this.ingredients.replaceSteps(recipeId, data.steps);
  }

  private searchCondition(q: string): SQL {
    const normalizedQ = normalizeSearchString(q);
    return or(
      like(sqlNormalize(recipes.name), `%${normalizedQ}%`),
      like(sqlNormalize(recipes.kitchen), `%${normalizedQ}%`),
      sql`EXISTS (SELECT 1 FROM recipe_ingredients ri
           INNER JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
           WHERE ri.recipe_id = recipes.recipe_id AND replace(replace(i.name, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`})`,
    ) as SQL;
  }
}
