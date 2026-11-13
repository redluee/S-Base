import { RECIPE_STATUSES, type RecipeStatus } from "@backend/shared/recipes";

export { RECIPE_STATUSES };

export const STATUS_BADGE: Record<RecipeStatus, string> = {
  "to try": "bg-muted text-black",
  success: "bg-brand/20 text-brand",
  "needs tweak": "bg-amber-900/30 text-amber-400",
  failure: "bg-destructive/10 text-destructive",
  archived: "bg-zinc-800 text-zinc-400",
};

export const STATUS_SELECTED: Record<RecipeStatus, string> = {
  "to try": "bg-muted text-black",
  success: "bg-brand text-zinc-900",
  "needs tweak": "bg-amber-600 text-black",
  failure: "bg-destructive text-white",
  archived: "bg-zinc-800 text-zinc-400",
};

export const STATUS_IDLE =
  "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground";

export function statusBadge(status: string | null | undefined): string | undefined {
  const known = RECIPE_STATUSES.find((s) => s === status);
  return known ? STATUS_BADGE[known] : undefined;
}
