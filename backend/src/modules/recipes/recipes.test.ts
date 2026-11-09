import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { RecipesService } from "./index";
import type { RecipeCatalog } from "./recipes-catalog";

describe("RecipeCatalog", () => {
  let service: RecipesService;
  let recipeService: RecipeCatalog;

  beforeEach(async () => {
    await setupTestDb();
    service = new RecipesService();
    recipeService = service.catalog;
  });

  it("validates cooking time and ingredient quantity when creating recipe", () => {
    expect(() =>
      recipeService.create({
        name: "Invalid Cooking Time",
        cookingTime: -10,
      })
    ).toThrow(new ValidationError("recipes.cookingTimeNegative"));

    expect(() =>
      recipeService.create({
        name: "Invalid Ingredient Quantity",
        ingredients: [{ name: "Zout", quantity: 0 }],
      })
    ).toThrow(new ValidationError("recipes.ingredientQuantityPositive"));
  });

  it("creates, retrieves, and updates recipes with ingredients and steps", () => {
    const created = recipeService.create({
      name: "Pasta Carbonara",
      cookingTime: 20,
      kitchen: "Italiaans",
      status: "success",
      rating: 9,
      ingredients: [
        { name: "Spaghetti", quantity: 200, unit: "g" },
        { name: "Pancetta", quantity: 100, unit: "g" },
      ],
      steps: [
        { description: "Kook de spaghetti." },
        { description: "Bak de pancetta knapperig." },
      ],
    });

    expect(created.name).toBe("Pasta Carbonara");
    expect(created.ingredients.length).toBe(2);
    expect(created.steps.length).toBe(2);

    const fetched = recipeService.getById(created.recipeId);
    expect(fetched.name).toBe("Pasta Carbonara");

    const updated = recipeService.update(created.recipeId, {
      rating: 10,
      description: "Super lekker klassiek Italiaans recept",
    });
    expect(updated.rating).toBe(10);
    expect(updated.description).toBe("Super lekker klassiek Italiaans recept");
  });

  it("filters and searches recipes", () => {
    recipeService.create({ name: "Kippensoep", kitchen: "Nederlands", status: "to try" });

    const listToTry = recipeService.list({ status: "to try" });
    expect(listToTry.some((r) => r.name === "Kippensoep")).toBe(true);

    const searchRes = recipeService.list({ q: "Kip" });
    expect(searchRes.length).toBeGreaterThan(0);

    const suggestions = recipeService.suggest("Kip");
    expect(suggestions.length).toBeGreaterThan(0);

    const ingSuggestions = service.ingredients.search("Spaghetti");
    expect(ingSuggestions.length).toBeGreaterThan(0);
  });

  it("updates recipe status and rating with bounds check", () => {
    const r = recipeService.create({ name: "Test Recipe" });
    const recipeId = r.recipeId;

    const statusRes = recipeService.updateStatus(recipeId, "needs tweak");
    expect(statusRes.status).toBe("needs tweak");

    const ratingRes = recipeService.updateRating(recipeId, 8);
    expect(ratingRes.rating).toBe(8);

    expect(() => recipeService.updateRating(recipeId, 15)).toThrow(new ValidationError("recipes.invalidRating"));
    expect(() => recipeService.updateStatus(recipeId, "nope")).toThrow(new ValidationError("recipes.invalidStatus"));

    const removeRes = recipeService.remove(recipeId);
    expect(removeRes.deleted).toBe(true);
    expect(() => recipeService.getById(recipeId)).toThrow(NotFoundError);
    expect(() => recipeService.remove(recipeId)).toThrow(new NotFoundError("recipes.notFound"));
  });
});
