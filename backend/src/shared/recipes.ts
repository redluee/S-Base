export const RECIPE_STATUSES = ["to try", "success", "needs tweak", "failure", "archived"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];
export const DEFAULT_RECIPE_STATUS: RecipeStatus = "to try";

export const WINE_TYPES = ["red", "white", "rose", "sparkling", "dessert"] as const;
export type WineType = (typeof WINE_TYPES)[number];

export const PURCHASE_LOCATIONS = [
  "supermarket",
  "wine_shop",
  "winery",
  "online",
  "restaurant",
  "gift",
  "other",
] as const;
export type PurchaseLocation = (typeof PURCHASE_LOCATIONS)[number];

const RATING_RANGE = { min: 0, max: 10 } as const;

export function isRating(value: number): boolean {
  return value >= RATING_RANGE.min && value <= RATING_RANGE.max;
}

export function isRecipeStatus(value: unknown): value is RecipeStatus {
  return RECIPE_STATUSES.includes(value as RecipeStatus);
}

export function isWineType(value: unknown): value is WineType {
  return WINE_TYPES.includes(value as WineType);
}

export function isPurchaseLocation(value: unknown): value is PurchaseLocation {
  return PURCHASE_LOCATIONS.includes(value as PurchaseLocation);
}

export const RECIPE_UNITS = ["g", "kg", "ml", "l", "pcs", "tsp", "tbsp", "pinch"] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];
export const DEFAULT_RECIPE_UNIT: RecipeUnit = "pcs";

export function isRecipeUnit(value: unknown): value is RecipeUnit {
  return RECIPE_UNITS.includes(value as RecipeUnit);
}

export const RECIPE_IMPORT_MAX_LENGTH = 40000;
