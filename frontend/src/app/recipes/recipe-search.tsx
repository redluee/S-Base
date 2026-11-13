"use client";

import { api } from "@/lib/api";
import { kitchens } from "@/app/recipes/kitchens";
import { SearchBar, type SearchConfig, type SearchSuggestion } from "@/components/search-bar";
import { normalizeSearchString } from "@backend/shared/search";

const TYPE_LABELS = { recipe: "Recipe", ingredient: "Ingredient", kitchen: "Kitchen" } as const;

export const recipeSearch: SearchConfig = {
  placeholder: "Search recipes…",
  ariaLabel: "Zoek recepten",
  async suggest(q) {
    const remote = await api.recipes.suggest(q);
    const normalizedQ = normalizeSearchString(q);
    const localKitchens = kitchens
      .filter((k) => normalizeSearchString(k.name).includes(normalizedQ))
      .filter((k) => !remote.some((r) => r.type === "kitchen" && r.value === k.name))
      .map((k) => ({ type: "kitchen" as const, value: k.name }));
    return [...remote, ...localKitchens].map((s): SearchSuggestion => ({ value: s.value, typeLabel: TYPE_LABELS[s.type] }));
  },
  searchHref: (query) => `/recipes?q=${encodeURIComponent(query)}`,
};

export function RecipeSearchBar() {
  return <SearchBar config={recipeSearch} />;
}
