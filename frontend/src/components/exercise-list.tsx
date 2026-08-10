"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X, Filter, Folder, Dumbbell, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/lang";

export interface ExerciseListItem {
  name: string;
  equipment: string | null;
  equipments?: string[];
  category?: string | null;
  categories?: string[];
}

const KNOWN_CATEGORIES = [
  "Free Weights",
  "Bodyweight",
  "Machines",
  "Functional",
  "Cardio",
];

interface ExerciseListProps {
  exercises: ExerciseListItem[];
  initialQuery?: string;
  initialCategory?: string;
  initialEquipment?: string;
}

export function ExerciseList({
  exercises,
  initialQuery = "",
  initialCategory = "",
  initialEquipment = "",
}: ExerciseListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || initialCategory
  );
  const [selectedEquipment, setSelectedEquipment] = useState(
    searchParams.get("equipment") || initialEquipment
  );

  // Extract all unique equipment options present in the dataset
  const availableEquipments = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) {
      const eqs = ex.equipments && ex.equipments.length > 0
        ? ex.equipments
        : (ex.equipment ? [ex.equipment] : []);
      for (const eq of eqs) {
        if (eq && eq !== "none" && eq !== "null" && eq !== "undefined") {
          set.add(eq);
        }
      }
    }
    return Array.from(set).sort();
  }, [exercises]);

  // Extract all unique categories present in dataset + standard list
  const availableCategories = useMemo(() => {
    const set = new Set<string>(KNOWN_CATEGORIES);
    for (const ex of exercises) {
      const cats = ex.categories && ex.categories.length > 0
        ? ex.categories
        : (ex.category ? [ex.category] : []);
      for (const cat of cats) {
        if (cat && cat !== "null" && cat !== "undefined") {
          set.add(cat);
        }
      }
    }
    return Array.from(set);
  }, [exercises]);

  // Update URL search parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedEquipment) params.set("equipment", selectedEquipment);

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [q, selectedCategory, selectedEquipment, pathname, router]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // 1. Query filter
      if (q) {
        const normQ = q.replace(/[\s\-\/]/g, "").toLowerCase();
        const nameNorm = ex.name.replace(/[\s\-\/]/g, "").toLowerCase();
        const eqNorms = (ex.equipments || []).map((eq) =>
          t(eq).replace(/[\s\-\/]/g, "").toLowerCase()
        );
        const catNorms = (ex.categories || []).map((c) =>
          t(c).replace(/[\s\-\/]/g, "").toLowerCase()
        );
        const matchesQ =
          nameNorm.includes(normQ) ||
          eqNorms.some((eq) => eq.includes(normQ)) ||
          catNorms.some((cat) => cat.includes(normQ));

        if (!matchesQ) return false;
      }

      // 2. Category filter
      if (selectedCategory) {
        const cats = ex.categories && ex.categories.length > 0
          ? ex.categories
          : (ex.category ? [ex.category] : ["Free Weights"]);
        const matchesCat = cats.some(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase()
        );
        if (!matchesCat) return false;
      }

      // 3. Equipment filter
      if (selectedEquipment) {
        const eqs = ex.equipments && ex.equipments.length > 0
          ? ex.equipments
          : (ex.equipment ? [ex.equipment] : []);
        const matchesEq = eqs.some(
          (eq) => eq.toLowerCase() === selectedEquipment.toLowerCase()
        );
        if (!matchesEq) return false;
      }

      return true;
    });
  }, [exercises, q, selectedCategory, selectedEquipment]);

  const hasActiveFilters = Boolean(q || selectedCategory || selectedEquipment);

  const resetFilters = () => {
    setQ("");
    setSelectedCategory("");
    setSelectedEquipment("");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Filter Control Bar */}
      <div className="flex flex-col gap-3 bg-card p-4 rounded-xl ring-1 ring-foreground/10 shadow-sm">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Filter exercises...")}
            className="w-full pl-10 pr-9 py-2.5 bg-background text-foreground text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns / Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Category Select */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={cn(
                  "w-full appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer bg-background text-foreground",
                  selectedCategory
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border hover:bg-foreground/5"
                )}
              >
                <option value="">{t("All categories")}</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(cat)}
                  </option>
                ))}
              </select>
              <Folder className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Equipment Select */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className={cn(
                  "w-full appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer bg-background text-foreground",
                  selectedEquipment
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border hover:bg-foreground/5"
                )}
              >
                <option value="">{t("All equipment")}</option>
                {availableEquipments.map((eq) => (
                  <option key={eq} value={eq}>
                    {t(eq)}
                  </option>
                ))}
              </select>
              <Dumbbell className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>{t("Clear filters")}</span>
              </Button>
            )}
          </div>

          {/* Item Count */}
          <div className="text-xs text-muted-foreground font-medium self-center">
            {filteredExercises.length}{" "}
            {filteredExercises.length === 1 ? t("exercise") : t("exercises")}
          </div>
        </div>
      </div>

      {/* Exercise List Results */}
      {filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl ring-1 ring-foreground/10 p-6">
          <Filter className="size-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {t("No exercises found matching your filters.")}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {t("Try clearing your search query or changing active filters.")}
          </p>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>{t("Clear filters")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredExercises.map((ex) => {
            const equipments =
              ex.equipments && ex.equipments.length > 0
                ? ex.equipments
                : ex.equipment
                ? [ex.equipment]
                : [];
            const category = ex.category || (ex.categories && ex.categories[0]) || "Free Weights";

            return (
              <Link
                key={ex.name}
                href={`/workouts/exercises/${encodeURIComponent(ex.name)}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/35 transition-all duration-200 active:scale-[0.99] hover:-translate-y-[1px]"
              >
                <div className="px-4 sm:px-5 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {ex.name}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Category badge */}
                        {category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium border border-brand/20">
                            {t(category)}
                          </span>
                        )}

                        {/* Equipment badges */}
                        {equipments.map((eq) => (
                          <span
                            key={eq}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground font-medium ring-1 ring-foreground/10"
                          >
                            {t(eq)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
