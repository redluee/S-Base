import { eq, like } from "drizzle-orm";
import db from "../../db/client";
import { ingredients, recipeIngredients, recipeSteps } from "../../db/schema";
import { ValidationError } from "../../utils/errors";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";

export interface IngredientInput {
  name: string;
  quantity: number;
  unit?: string;
  sortOrder?: number;
  isOptional?: boolean;
}

export interface StepInput {
  description: string;
}

export class RecipeIngredients {
  search(q: string) {
    const normalizedQ = normalizeSearchString(q);
    return db
      .select({ ingredientId: ingredients.ingredientId, name: ingredients.name })
      .from(ingredients)
      .where(like(sqlNormalize(ingredients.name), `%${normalizedQ}%`))
      .limit(8)
      .all();
  }

  assertValid(list: IngredientInput[] | undefined) {
    if (list?.some((ing) => !(ing.quantity > 0))) throw new ValidationError("recipes.ingredientQuantityPositive");
  }

  replaceIngredients(recipeId: number, list: IngredientInput[]) {
    db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId)).run();
    list.forEach((ing, i) => {
      const ingredient = this.findOrCreate(ing.name);
      db.insert(recipeIngredients)
        .values({
          recipeId,
          ingredientId: ingredient.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          sortOrder: ing.sortOrder ?? i,
          isOptional: ing.isOptional ?? false,
        })
        .run();
    });
  }

  replaceSteps(recipeId: number, steps: StepInput[]) {
    db.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipeId)).run();
    steps.forEach((step, i) => {
      db.insert(recipeSteps).values({ recipeId, stepNumber: i + 1, description: step.description }).run();
    });
  }

  private findOrCreate(name: string) {
    const existing = db.select().from(ingredients).where(eq(ingredients.name, name)).get();
    return existing ?? db.insert(ingredients).values({ name }).returning().get();
  }
}
