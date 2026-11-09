export const RECIPE_STATUSES = ["to try", "success", "needs tweak", "failure", "archived"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

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

export function isRecipeStatus(value: unknown): value is RecipeStatus {
  return RECIPE_STATUSES.includes(value as RecipeStatus);
}

export function isWineType(value: unknown): value is WineType {
  return WINE_TYPES.includes(value as WineType);
}

export function isPurchaseLocation(value: unknown): value is PurchaseLocation {
  return PURCHASE_LOCATIONS.includes(value as PurchaseLocation);
}
