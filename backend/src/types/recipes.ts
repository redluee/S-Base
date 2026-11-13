import type { RecipeWines } from "../modules/recipes/recipes-wines";

export type Wine = ReturnType<RecipeWines["getById"]>;
