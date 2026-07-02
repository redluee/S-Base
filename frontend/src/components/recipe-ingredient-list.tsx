"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { GripVertical, X, ChevronUp, ChevronDown, CircleDashed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { t } from "@/lib/lang";

const UNITS = ["g", "kg", "ml", "l", "pcs", "tsp", "tbsp", "pinch"];

export interface IngredientRow {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  isOptional: boolean;
}

interface RecipeIngredientListProps {
  ingredients: IngredientRow[];
  onChange: (newIngs: IngredientRow[]) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function RecipeIngredientList({
  ingredients,
  onChange,
  errors,
  setErrors,
}: RecipeIngredientListProps) {
  const [animateFirstRender, setAnimateFirstRender] = useState(true);
  const [newAddedIds, setNewAddedIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Drag and drop states
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPositionsRef = useRef<Map<string, number>>(new Map());
  const [reorderTick, setReorderTick] = useState(0);
  const hoverIndexRef = useRef<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const naturalPositionsRef = useRef<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateFirstRender(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const children = containerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const id = ingredients[i]?.id;
      if (id) {
        const prevTop = prevPositionsRef.current.get(id);
        const rect = children[i].getBoundingClientRect();
        if (prevTop !== undefined && prevTop !== rect.top) {
          const delta = prevTop - rect.top;
          (children[i] as HTMLElement).style.transform = `translateY(${delta}px)`;
          (children[i] as HTMLElement).style.transition = 'transform 0s';
          
          requestAnimationFrame(() => {
            if (children[i]) {
              (children[i] as HTMLElement).style.transform = '';
              (children[i] as HTMLElement).style.transition = 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)';
            }
          });
        }
      }
    }
    prevPositionsRef.current.clear();
  }, [reorderTick, ingredients]);

  function addIngredient() {
    const id = `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNewAddedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
    onChange([...ingredients, { id, name: "", quantity: "1", unit: "pcs", isOptional: false }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`ing-name-${id}`)?.focus();
      });
    });
  }

  function removeIngredient(id: string) {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onChange(ingredients.filter((ing) => ing.id !== id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}-name`];
        delete next[`${id}-quantity`];
        return next;
      });
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }

  function updateIngredient(id: string, field: keyof Omit<IngredientRow, "id">, value: string | boolean) {
    onChange(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  }

  function moveIngredient(from: number, to: number) {
    if (to < 0 || to >= ingredients.length) return;

    if (containerRef.current) {
      const children = containerRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const id = ingredients[i]?.id;
        if (id) {
          prevPositionsRef.current.set(id, (children[i] as HTMLElement).getBoundingClientRect().top);
        }
      }
    }

    const next = [...ingredients];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);

    setReorderTick((t) => t + 1);
  }

  function moveIngredientUp(i: number) {
    moveIngredient(i, i - 1);
  }

  function moveIngredientDown(i: number) {
    moveIngredient(i, i + 1);
  }

  function getDragOffset(): number {
    if (!containerRef.current || dragIndexRef.current === null) return 60;
    const cs = getComputedStyle(containerRef.current);
    const gap = parseFloat(cs.rowGap) || parseFloat(cs.gap) || 8;
    const el = containerRef.current.children[dragIndexRef.current] as HTMLElement;
    return el?.getBoundingClientRect().height + gap;
  }

  function moveIngredientDirect(from: number, to: number) {
    if (to < 0 || to > ingredients.length) return;
    const next = [...ingredients];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function updateDragVisuals() {
    const from = dragIndexRef.current;
    const to = hoverIndexRef.current;
    if (from === null || to === null || !containerRef.current) return;

    const children = containerRef.current.children;
    const offset = getDragOffset();

    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.style.transition = 'transform 150ms ease-out';

      if (i === from) {
        el.style.transform = `translateY(${(to - from) * offset}px)`;
      } else if (i < from) {
        el.style.transform = to <= i ? `translateY(${offset}px)` : '';
      } else if (i > from) {
        el.style.transform = to >= i ? `translateY(-${offset}px)` : '';
      }
    }
  }

  function clearDragTransforms() {
    if (!containerRef.current) return;
    const children = containerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.style.transition = '';
      el.style.transform = '';
    }
  }

  function resetDragTransforms() {
    if (!containerRef.current) return;
    const children = containerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.style.transition = 'transform 150ms ease-out';
      el.style.transform = '';
    }
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIndex(idx);
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));

    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);

    if (containerRef.current) {
      const positions: number[] = [];
      for (let i = 0; i < containerRef.current.children.length; i++) {
        const rect = containerRef.current.children[i].getBoundingClientRect();
        positions.push(rect.top + rect.height / 2);
      }
      naturalPositionsRef.current = positions;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const from = dragIndexRef.current;
    if (from === null || naturalPositionsRef.current.length === 0) return;

    const mouseY = e.clientY;
    let targetIndex = 0;

    for (let i = 0; i < naturalPositionsRef.current.length; i++) {
      if (i === from) continue;
      if (mouseY >= naturalPositionsRef.current[i]) {
        targetIndex++;
      }
    }

    if (targetIndex === hoverIndexRef.current) return;
    hoverIndexRef.current = targetIndex;
    updateDragVisuals();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = hoverIndexRef.current;

    clearDragTransforms();

    if (from !== null && to !== null && from !== to) {
      moveIngredientDirect(from, to);
    }

    setDragIndex(null);
    dragIndexRef.current = null;
    hoverIndexRef.current = null;
    naturalPositionsRef.current = [];
  }

  function handleDragEnd() {
    resetDragTransforms();
    setDragIndex(null);
    dragIndexRef.current = null;
    hoverIndexRef.current = null;
    naturalPositionsRef.current = [];
  }

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Ingredients")}</h2>

      <div ref={containerRef} className="flex flex-col gap-2">
        {ingredients.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 sm:py-8 text-center">
            {t("No ingredients yet.")}
          </p>
        )}
        {ingredients.map((ing, i) => (
          <div
            key={ing.id}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`${animateFirstRender || newAddedIds.has(ing.id) ? "ingredient-enter" : ""} flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 rounded-lg border border-border/50 bg-white/[0.02] p-2 sm:p-2.5 transition-colors hover:border-border/80 ${
              exitingIds.has(ing.id) ? "ingredient-exit" : ""
            } ${dragIndex === i ? "opacity-50" : ""}`}
            style={{ animationDelay: exitingIds.has(ing.id) ? "0ms" : `${i * 30}ms` }}
          >
            <div
              className="hidden sm:flex items-center justify-center cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="size-4 text-muted-foreground/30 pointer-events-none" />
            </div>
            <div className="w-full sm:flex-1 sm:min-w-0 flex items-center gap-2">
              <div className="flex-1">
                <IngredientAutocomplete
                  id={`ing-name-${ing.id}`}
                  value={ing.name}
                  placeholder={t("Ingredient")}
                  onChange={(value) => {
                    updateIngredient(ing.id, "name", value);
                    if (errors[`${ing.id}-name`]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next[`${ing.id}-name`];
                        return next;
                      });
                    }
                  }}
                  onSelect={(name) => {
                    updateIngredient(ing.id, "name", name);
                    if (errors[`${ing.id}-name`]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next[`${ing.id}-name`];
                        return next;
                      });
                    }
                  }}
                  className={errors[`${ing.id}-name`] ? "border-red-500/50 focus-visible:ring-red-500/30" : ""}
                />
                {errors[`${ing.id}-name`] && (
                  <span className="text-xs text-red-400 mt-0.5 block">
                    {errors[`${ing.id}-name`]}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => updateIngredient(ing.id, "isOptional", !ing.isOptional)}
                className={`h-9 sm:h-8 w-9 sm:w-8 transition-all duration-200 rounded-md border shrink-0 ${
                  ing.isOptional
                    ? "border-brand text-brand bg-brand/10 hover:bg-brand/20 shadow-glow-sm"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                title={t("Optional")}
              >
                <CircleDashed className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(ing.id)}
                className="sm:hidden h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-950/50 transition-all active:scale-[0.92] shrink-0"
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <div className="flex-1 sm:w-24 sm:flex-none">
              <Input
                id={`ing-qty-${ing.id}`}
                type="number"
                step="any"
                min="0.01"
                value={ing.quantity}
                onChange={(e) => {
                  if (!e.target.value.startsWith("-")) {
                    updateIngredient(ing.id, "quantity", e.target.value);
                  }
                  if (errors[`${ing.id}-quantity`]) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next[`${ing.id}-quantity`];
                      return next;
                    });
                  }
                }}
                placeholder={t("Qty")}
                className={`bg-white/5 h-9 sm:h-8 transition-all focus-visible:border-brand/50 appearance-none ${
                  errors[`${ing.id}-quantity`] ? "border-red-500/50 focus-visible:ring-red-500/30" : "border-border"
                }`}
              />
              {errors[`${ing.id}-quantity`] && (
                <span className="text-xs text-red-400 mt-0.5 block">
                  {errors[`${ing.id}-quantity`]}
                </span>
              )}
            </div>
            <div className="flex-[2] sm:w-28 sm:flex-none">
              <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v ?? "pcs")}>
                <SelectTrigger className="bg-white/5 border-border h-9 sm:h-8 w-full">
                  <SelectValue>{t(ing.unit)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{t(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-none flex items-center justify-center gap-1">
              <div className="flex sm:hidden gap-1.5">
                <button
                  type="button"
                  onClick={() => moveIngredientUp(i)}
                  disabled={i === 0}
                  className="h-9 w-9 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveIngredientDown(i)}
                  disabled={i === ingredients.length - 1}
                  className="h-9 w-9 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(ing.id)}
                className="hidden sm:flex text-muted-foreground hover:text-red-400 hover:bg-red-950/50 transition-all active:scale-[0.92]"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addIngredient}
        className="w-full mt-3 border-border transition-all active:scale-[0.97] text-xs sm:text-sm h-9 sm:h-8"
      >
        <Plus className="size-3.5" />
        {t("Add ingredient")}
      </Button>
    </div>
  );
}
