import { RecipeCatalog } from "./recipes-catalog";
import { RecipeImporter } from "./recipes-import";
import { RecipeIngredients } from "./recipes-ingredients";
import { RecipeWines } from "./recipes-wines";

export class RecipesService {
  readonly ingredients = new RecipeIngredients();
  readonly catalog = new RecipeCatalog(this.ingredients);
  readonly wines = new RecipeWines();
  readonly importer = new RecipeImporter();
}
