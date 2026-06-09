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
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { Plus, X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = ["g", "kg", "ml", "l", "pcs", "tsp", "tbsp", "pinch"];
const FOOD_TYPES = ["vegetable", "fruit", "meat", "fish", "spice", "liquid", "dairy", "other"];
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

interface StepRow {
  id: string;
  description: string;
}

interface IngredientRow {
  id: string;
  name: string;
  foodType: string;
  quantity: string;
  unit: string;
}

export function RecipeForm({
  initial,
}: {
  initial?: any;
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
    initial?.ingredients?.map((i: any, idx: number) => ({
      id: `ing-${idx}`,
      name: i.name,
      foodType: i.foodType ?? "other",
      quantity: i.quantity.toString(),
      unit: i.unit ?? "g",
    })) ?? [],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps?.map((s: any, idx: number) => ({
      id: `step-${idx}`,
      description: s.description,
    })) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  function addIngredient() {
    const id = `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setIngredients((prev) => [...prev, { id, name: "", foodType: "other", quantity: "", unit: "g" }]);
  }

  function removeIngredient(id: string) {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }

  function updateIngredient(id: string, field: keyof Omit<IngredientRow, "id">, value: string) {
    setIngredients((prev) => prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  }

  function addStep() {
    const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSteps((prev) => [...prev, { id, description: "" }]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id: string, value: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError(t("Recipe name is required."));
      setLoading(false);
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
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name,
          foodType: ing.foodType,
          quantity: Number(ing.quantity),
          unit: ing.unit,
        })),
      steps: steps
        .filter((s) => s.description.trim())
        .map((s) => ({ description: s.description })),
    };

    try {
      if (isEdit) {
        await api.recipes.update(initial.recipeId, data);
      } else {
        await api.recipes.create(data);
      }
      router.push("/recipes");
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8">
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
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("e.g. Grilled Chicken with Salsa")}
                className="bg-white/5 border-border transition-all duration-150 focus-visible:border-brand/50 h-9 sm:h-8"
              />
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
                  value={cookingTime}
                  onChange={(e) => setCookingTime(e.target.value)}
                  placeholder="30"
                  className="bg-white/5 border-border transition-all duration-150 focus-visible:border-brand/50 h-9 sm:h-8"
                />
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
                          ? "bg-brand text-zinc-900 shadow-[0_0_12px_rgba(0,227,164,0.3)]"
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

        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">{t("Ingredients")}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="border-border transition-all active:scale-[0.97] text-xs sm:text-sm h-8 sm:h-7"
            >
              <Plus className="size-3.5" />
              {t("Add")}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 sm:py-8 text-center">
                {t('No ingredients yet. Click "Add" to get started.')}
              </p>
            )}
            {ingredients.map((ing, i) => (
              <div
                key={ing.id}
                className={`ingredient-enter grid grid-cols-4 sm:grid-cols-12 gap-1.5 sm:gap-2 items-end rounded-lg border border-border/50 bg-white/[0.02] p-2 sm:p-2.5 transition-colors hover:border-border/80 ${
                  exitingIds.has(ing.id) ? "ingredient-exit" : ""
                }`}
                style={{ animationDelay: exitingIds.has(ing.id) ? "0ms" : `${i * 30}ms` }}
              >
                <div className="col-span-4 sm:col-span-4 grid gap-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground leading-none">{t("Name")}</Label>
                  <IngredientAutocomplete
                    value={ing.name}
                    onChange={(value) => updateIngredient(ing.id, "name", value)}
                    onSelect={(name, foodType) => {
                      updateIngredient(ing.id, "name", name);
                      updateIngredient(ing.id, "foodType", foodType);
                    }}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 grid gap-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground leading-none">{t("Qty")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(ing.id, "quantity", e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-border h-9 sm:h-8 text-xs sm:text-sm transition-all focus-visible:border-brand/50"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 grid gap-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground leading-none">{t("Unit")}</Label>
                  <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v ?? "g")}>
                    <SelectTrigger className="bg-white/5 border-border h-9 sm:h-8 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{t(u)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-3 grid gap-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground leading-none">{t("Type")}</Label>
                  <Select value={ing.foodType} onValueChange={(v) => updateIngredient(ing.id, "foodType", v ?? "other")}>
                    <SelectTrigger className="bg-white/5 border-border h-9 sm:h-8 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>{t(ft)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-1 flex items-end justify-center sm:pb-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(ing.id)}
                    className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 transition-all active:scale-[0.92]"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">{t("Steps")}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              className="border-border transition-all active:scale-[0.97] text-xs sm:text-sm h-8 sm:h-7"
            >
              <Plus className="size-3.5" />
              {t("Add step")}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 sm:py-8 text-center">
                {t('No steps yet. Click "Add step" to get started.')}
              </p>
            )}
            {steps.map((step, i) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-white/[0.02] p-2.5 transition-colors hover:border-border/80"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-brand text-brand text-xs font-bold shrink-0 mt-2">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    placeholder={t("Step") + ` ${i + 1}...`}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none text-sm leading-relaxed min-h-[60px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(step.id)}
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 transition-all active:scale-[0.92] mt-1.5"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

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
