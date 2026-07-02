"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KitchenCombobox } from "@/components/kitchen-combobox";
import { RecipeIngredientList, IngredientRow } from "@/components/recipe-ingredient-list";
import { RecipeStepList, StepRow } from "@/components/recipe-step-list";
import { Loader2 } from "lucide-react";
import type { FullRecipe } from "@backend/types/shared";

const STATUSES = ["to try", "success", "needs tweak", "failure", "archived"];

const statusStyles: Record<string, string> = {
  "to try": "bg-zinc-600 text-white",
  success: "bg-brand text-zinc-900",
  "needs tweak": "bg-amber-600 text-black",
  failure: "bg-red-600 text-white",
  archived: "bg-zinc-700 text-zinc-300",
};

const statusIdleStyles: Record<string, string> = {
  "to try": "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground",
  success: "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground",
  "needs tweak": "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground",
  failure: "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground",
  archived: "bg-transparent text-muted-foreground ring-1 ring-border hover:ring-zinc-600 hover:text-foreground",
};

export function RecipeForm({
  initial,
}: {
  initial?: FullRecipe;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cookingTime, setCookingTime] = useState(initial?.cookingTime?.toString() ?? "");
  const [kitchen, setKitchen] = useState(initial?.kitchen ?? "");
  const [status, setStatus] = useState(initial?.status ?? "to try");
  const [rating, setRating] = useState(initial?.rating?.toString() ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients?.map((i, idx: number) => ({
      id: `ing-${idx}`,
      name: i.name,
      quantity: i.quantity.toString(),
      unit: i.unit ?? "pcs",
      isOptional: i.isOptional ?? false,
    })) ?? [],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps?.map((s, idx: number) => ({
      id: `step-${idx}`,
      description: s.description,
    })) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t("Recipe name is required.");
    }

    if (cookingTime !== "") {
      const parsedTime = Number(cookingTime);
      if (isNaN(parsedTime) || parsedTime < 0) {
        newErrors.cookingTime = t("Cooking time cannot be negative.");
      }
    }

    ingredients.forEach((ing) => {
      const isNameEmpty = !ing.name.trim();
      const isQtyEmpty = !ing.quantity.trim();
      const isQtyInvalid = isQtyEmpty || isNaN(Number(ing.quantity)) || Number(ing.quantity) <= 0;

      const isActive = !isNameEmpty || !isQtyEmpty;

      if (isActive) {
        if (isNameEmpty) {
          newErrors[`${ing.id}-name`] = t("Ingredient name is required.");
        }
        if (isQtyInvalid) {
          newErrors[`${ing.id}-quantity`] = t("Quantity must be greater than 0.");
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);

      // Focus the first invalid input
      const firstErrorKey = Object.keys(newErrors)[0];
      let elementId = "";
      if (firstErrorKey === "name") {
        elementId = "name";
      } else if (firstErrorKey === "cookingTime") {
        elementId = "cookingTime";
      } else if (firstErrorKey.endsWith("-name")) {
        elementId = `ing-name-${firstErrorKey.replace("-name", "")}`;
      } else if (firstErrorKey.endsWith("-quantity")) {
        elementId = `ing-qty-${firstErrorKey.replace("-quantity", "")}`;
      }

      if (elementId) {
        setTimeout(() => {
          const el = document.getElementById(elementId);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
      }
      return;
    }

    const data = {
      name,
      description: description || undefined,
      cookingTime: cookingTime ? Number(cookingTime) : undefined,
      kitchen: kitchen || undefined,
      status,
      rating: rating ? Number(rating) : undefined,
      ingredients: ingredients
        .filter((ing) => ing.name.trim() || ing.quantity.trim())
        .map((ing, i) => ({
          name: ing.name.trim(),
          quantity: Number(ing.quantity),
          unit: ing.unit,
          sortOrder: i,
          isOptional: ing.isOptional,
        })),
      steps: steps
        .filter((s) => s.description.trim())
        .map((s) => ({ description: s.description })),
    };

    try {
      let result;
      if (isEdit) {
        result = await api.recipes.update(initial.recipeId, data);
      } else {
        result = await api.recipes.create(data);
      }
      router.push(`/recipes/${result.recipeId}`);
      router.refresh();
    } catch (err) {
      setError(t("Failed to save recipe. Please try again."));
      console.error("Failed to save recipe", err);
    } finally {
      setLoading(false);
    }
  }

  const selectedRating = rating ? Number(rating) : undefined;
  const activeRating = hoveredRating ?? selectedRating;

  return (
    <>
      <style>{`
        @keyframes ingredient-enter {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ingredient-exit {
          to { opacity: 0; transform: translateY(-8px) scale(0.97); }
        }
        .ingredient-enter {
          animation: ingredient-enter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        .ingredient-exit {
          animation: ingredient-exit 200ms cubic-bezier(0.23, 1, 0.32, 1) both;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .ingredient-enter,
          .ingredient-exit { animation: none; }
        }
      `}</style>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 sm:gap-8">
        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Basic Info")}</h2>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="name">{t("Name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                required
                placeholder={t("e.g. Grilled Chicken with Salsa")}
                className={`bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 ${
                  errors.name ? "border-red-500/50 focus-visible:ring-red-500/30" : "border-border"
                }`}
              />
              {errors.name && (
                <span className="text-xs text-red-400 mt-0.5">
                  {errors.name}
                </span>
              )}
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="description">{t("Description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("A brief description of the dish...")}
                className="bg-white/5 border-border min-h-[80px] transition-all duration-150 focus-visible:border-brand/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Details")}</h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-1.5 sm:gap-2">
                <Label htmlFor="cookingTime">{t("Cooking time (min)")}</Label>
                <Input
                  id="cookingTime"
                  type="number"
                  min="0"
                  value={cookingTime}
                  onChange={(e) => {
                    if (!e.target.value.startsWith("-")) {
                      setCookingTime(e.target.value);
                    }
                    if (errors.cookingTime) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.cookingTime;
                        return next;
                      });
                    }
                  }}
                  placeholder="30"
                  className={`bg-white/5 h-9 sm:h-8 transition-all duration-150 focus-visible:border-brand/50 ${
                    errors.cookingTime ? "border-red-500/50 focus-visible:ring-red-500/30" : "border-border"
                  }`}
                />
                {errors.cookingTime && (
                  <span className="text-xs text-red-400 mt-0.5">
                    {errors.cookingTime}
                  </span>
                )}
              </div>
              <div className="grid gap-1.5 sm:gap-2">
                <Label htmlFor="kitchen">{t("Kitchen")}</Label>
                <KitchenCombobox value={kitchen} onChange={setKitchen} />
              </div>
            </div>

            <div className="grid gap-1.5 sm:gap-2">
              <Label>{t("Status")}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-[0.97] ${
                      status === s ? statusStyles[s] : statusIdleStyles[s]
                    }`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5 sm:gap-2">
              <Label>{t("Rating")}</Label>
              <div
                className="flex gap-1 sm:gap-1.5 flex-wrap"
                onMouseLeave={() => setHoveredRating(null)}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const val = i + 1;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val.toString())}
                      onMouseEnter={() => setHoveredRating(val)}
                      className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all active:scale-[0.92] ${
                        activeRating != null && val <= activeRating
                          ? "bg-brand text-zinc-900 shadow-glow-sm"
                          : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <RecipeIngredientList
          ingredients={ingredients}
          onChange={setIngredients}
          errors={errors}
          setErrors={setErrors}
        />

        <RecipeStepList
          steps={steps}
          onChange={setSteps}
        />

        <Button
          type="submit"
          disabled={loading}
          className="bg-brand text-zinc-900 hover:bg-brand-hover h-10 sm:h-10 transition-all active:scale-[0.97] disabled:active:scale-100 text-sm sm:text-base"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t("Saving...")}
            </span>
          ) : isEdit ? (
            t("Save Changes")
          ) : (
            t("Create Recipe")
          )}
        </Button>
      </form>
    </>
  );
}
