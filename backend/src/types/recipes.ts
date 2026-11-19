import type { RecipeCatalog } from "../modules/recipes/recipes-catalog";
import type { RecipeWines } from "../modules/recipes/recipes-wines";

export type Recipe = ReturnType<RecipeCatalog["list"]>[number];
export type FullRecipe = ReturnType<RecipeCatalog["getById"]>;
export type Wine = ReturnType<RecipeWines["getById"]>;
export type { RecipeDraft } from "../modules/recipes/recipes-import";
