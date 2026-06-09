import { eq, asc, desc, like, and, or, sql } from "drizzle-orm";
import db from "../../db/client";
import { recipes, ingredients, recipeIngredients, recipeSteps } from "../../db/schema";

const STATUSES = ["to try", "success", "needs tweak", "failure", "archived"] as const;

export class RecipeService {
  list(status?: string, sortBy?: string, sortOrder?: string) {
    const columnMap: Record<string, any> = {
      name: recipes.name,
      rating: recipes.rating,
      cookingTime: recipes.cookingTime,
    };

    const column = columnMap[sortBy ?? "name"] ?? recipes.name;
    const orderFn = sortOrder === "desc" ? desc : asc;

    const query = db.select().from(recipes).orderBy(orderFn(column));
    if (status && STATUSES.includes(status as any)) {
      query.where(eq(recipes.status, status));
    }
    return query.all();
  }

  search(q: string, status?: string, sortBy?: string, sortOrder?: string) {
    const columnMap: Record<string, any> = {
      name: recipes.name,
      rating: recipes.rating,
      cookingTime: recipes.cookingTime,
    };
    const column = columnMap[sortBy ?? "name"] ?? recipes.name;
    const orderFn = sortOrder === "desc" ? desc : asc;

    const conditions = [
      or(
        like(recipes.name, `%${q}%`),
        like(recipes.kitchen, `%${q}%`),
        sql`EXISTS (SELECT 1 FROM recipe_ingredients ri
             INNER JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
             WHERE ri.recipe_id = recipes.recipe_id AND i.name LIKE ${`%${q}%`})`,
      ),
    ];

    if (status && STATUSES.includes(status as any)) {
      conditions.push(eq(recipes.status, status));
    }

    return db.select().from(recipes).where(and(...conditions)).orderBy(orderFn(column)).all();
  }

  suggest(q: string) {
    const recipeNames = db.select({ name: recipes.name })
      .from(recipes)
      .where(like(recipes.name, `%${q}%`))
      .limit(5)
      .all()
      .map((r) => ({ type: "recipe" as const, value: r.name }));

    const ingredientNames = db.select({ name: ingredients.name })
      .from(ingredients)
      .where(like(ingredients.name, `%${q}%`))
      .limit(5)
      .all()
      .map((i) => ({ type: "ingredient" as const, value: i.name }));

    const kitchens = db.select({ name: recipes.kitchen })
      .from(recipes)
      .where(and(like(recipes.kitchen, `%${q}%`), sql`${recipes.kitchen} IS NOT NULL`, sql`${recipes.kitchen} != ''`))
      .limit(3)
      .all()
      .map((k) => ({ type: "kitchen" as const, value: k.name! }));

    return [...recipeNames, ...ingredientNames, ...kitchens];
  }

  getById(id: number) {
    const recipe = db.select().from(recipes).where(eq(recipes.recipeId, id)).get();
    if (!recipe) return null;

    const ings = db.select({
      ingredientId: ingredients.ingredientId,
      name: ingredients.name,
      foodType: ingredients.foodType,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
    })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.ingredientId))
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(recipeIngredients.sortOrder)
      .all();

    const steps = db.select({
      stepId: recipeSteps.stepId,
      stepNumber: recipeSteps.stepNumber,
      description: recipeSteps.description,
    })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.stepNumber)
      .all();

    return { ...recipe, ingredients: ings, steps };
  }

  create(data: {
    name: string;
    cookingTime?: number;
    kitchen?: string;
    status?: string;
    description?: string;
    rating?: number;
    ingredients?: { name: string; foodType?: string; quantity: number; unit?: string; sortOrder?: number }[];
    steps?: { description: string }[];
  }) {
    const recipe = db.insert(recipes).values({
      name: data.name,
      cookingTime: data.cookingTime,
      kitchen: data.kitchen,
      status: data.status ?? "to try",
      description: data.description,
      rating: data.rating,
    }).returning().get();

    if (data.ingredients?.length) {
      for (let i = 0; i < data.ingredients.length; i++) {
        const ing = data.ingredients[i];
        let existing = db.select().from(ingredients)
          .where(eq(ingredients.name, ing.name)).get();

        if (!existing) {
          existing = db.insert(ingredients).values({
            name: ing.name,
            foodType: ing.foodType ?? "other",
          }).returning().get();
        }

        db.insert(recipeIngredients).values({
          recipeId: recipe.recipeId,
          ingredientId: existing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          sortOrder: ing.sortOrder ?? i,
        }).run();
      }
    }

    if (data.steps?.length) {
      for (let i = 0; i < data.steps.length; i++) {
        db.insert(recipeSteps).values({
          recipeId: recipe.recipeId,
          stepNumber: i + 1,
          description: data.steps[i].description,
        }).run();
      }
    }

    return this.getById(recipe.recipeId);
  }

  update(id: number, data: {
    name?: string;
    cookingTime?: number;
    kitchen?: string;
    status?: string;
    description?: string;
    rating?: number;
    ingredients?: { name: string; foodType?: string; quantity: number; unit?: string; sortOrder?: number }[];
    steps?: { description: string }[];
  }) {
    const existing = db.select().from(recipes).where(eq(recipes.recipeId, id)).get();
    if (!existing) return null;

    db.update(recipes).set({
      name: data.name ?? existing.name,
      cookingTime: data.cookingTime ?? existing.cookingTime,
      kitchen: data.kitchen ?? existing.kitchen,
      status: data.status ?? existing.status,
      description: data.description ?? existing.description,
      rating: data.rating ?? existing.rating,
    }).where(eq(recipes.recipeId, id)).run();

    if (data.ingredients) {
      db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id)).run();

      for (let i = 0; i < data.ingredients.length; i++) {
        const ing = data.ingredients[i];
        let existingIng = db.select().from(ingredients)
          .where(eq(ingredients.name, ing.name)).get();

        if (!existingIng) {
          existingIng = db.insert(ingredients).values({
            name: ing.name,
            foodType: ing.foodType ?? "other",
          }).returning().get();
        }

        db.insert(recipeIngredients).values({
          recipeId: id,
          ingredientId: existingIng.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          sortOrder: ing.sortOrder ?? i,
        }).run();
      }
    }

    if (data.steps) {
      db.delete(recipeSteps).where(eq(recipeSteps.recipeId, id)).run();

      for (let i = 0; i < data.steps.length; i++) {
        db.insert(recipeSteps).values({
          recipeId: id,
          stepNumber: i + 1,
          description: data.steps[i].description,
        }).run();
      }
    }

    return this.getById(id);
  }

  remove(id: number) {
    const existing = db.select().from(recipes).where(eq(recipes.recipeId, id)).get();
    if (!existing) return null;
    db.delete(recipes).where(eq(recipes.recipeId, id)).run();
    return { deleted: true };
  }

  updateStatus(id: number, status: string) {
    if (!STATUSES.includes(status as any)) return new Error("Invalid status");
    db.update(recipes).set({ status: status as any }).where(eq(recipes.recipeId, id)).run();
    return this.getById(id);
  }

  updateRating(id: number, rating: number) {
    if (rating < 0 || rating > 10) return new Error("Rating must be 0-10");
    db.update(recipes).set({ rating }).where(eq(recipes.recipeId, id)).run();
    return this.getById(id);
  }

  ingredientSearch(q: string) {
    return db.select({
      ingredientId: ingredients.ingredientId,
      name: ingredients.name,
      foodType: ingredients.foodType,
    })
      .from(ingredients)
      .where(like(ingredients.name, `%${q}%`))
      .limit(8)
      .all();
  }
}
