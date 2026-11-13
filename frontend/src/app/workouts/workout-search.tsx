"use client";

import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { SearchBar, type SearchConfig, type SearchSuggestion } from "@/components/search-bar";

export const workoutSearch: SearchConfig = {
  placeholder: "Search workouts…",
  ariaLabel: "Zoek workouts",
  async suggest(q) {
    const remote = await api.workouts.suggest(q);
    return remote.map((r): SearchSuggestion => {
      if (r.type === "exercise") {
        const query = r.equipment ? `?equipment=${encodeURIComponent(r.equipment)}` : "";
        return {
          value: r.equipment ? `${r.value} (${t(r.equipment)})` : r.value,
          typeLabel: "Exercise",
          href: r.value ? `/workouts/exercises/${encodeURIComponent(r.value)}${query}` : undefined,
        };
      }
      if (r.type === "template") {
        return { value: r.value, typeLabel: "Template", href: r.id !== undefined ? `/workouts/t/${r.id}` : undefined };
      }
      return { value: r.value, typeLabel: "History", href: r.id !== undefined ? `/workouts/history/${r.id}` : undefined };
    });
  },
  searchHref: (query, pathname) => {
    const listPage = pathname.startsWith("/workouts/history") ? "/workouts/history" : "/workouts/exercises";
    return `${listPage}?q=${encodeURIComponent(query)}`;
  },
};

export function WorkoutSearchBar() {
  return <SearchBar config={workoutSearch} />;
}
