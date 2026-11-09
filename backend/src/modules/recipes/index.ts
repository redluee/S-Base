import { RecipeCatalog } from "./recipes-catalog";
import { RecipeIngredients } from "./recipes-ingredients";
import { RecipeWines } from "./recipes-wines";

export { PURCHASE_LOCATIONS, RECIPE_STATUSES, WINE_TYPES } from "./recipes-constants";

export class RecipesService {
  readonly ingredients = new RecipeIngredients();
  readonly catalog = new RecipeCatalog(this.ingredients);
  readonly wines = new RecipeWines();
}
