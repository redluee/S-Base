import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/lang";
import { X, Plus, ChevronRight, ChevronLeft, ChevronDown, Folder, Check } from "lucide-react";

export const CATEGORY_MAP = {
  "Bodyweight": [
    "Bodyweight",
    "Suspension Trainer",
    "Weighted Vest",
    "Assisted Machine",
  ],
  "Free Weights": [
    "Barbell",
    "Dumbbell",
    "Kettlebell",
    "Hex Bar",
    "Weight Plate",
  ],
  "Machines": [
    "Machine",
    "Cable",
    "Smith Machine",
  ],
  "Functional": [
    "Resistance Band",
    "Medicine Ball",
    "Sandbag",
    "Sled",
    "Plyo Box",
    "bal",
  ],
  "Cardio": [
    "Cardio Machine",
  ],
};

function normalizeCategoryName(cat?: string): string {
  if (!cat) return "Free Weights";
  const c = cat.toLowerCase().trim();
  if (c === "bodyweight") return "Bodyweight";
  if (c === "free weights" || c === "freeweights" || c === "resistance") return "Free Weights";
  if (c === "machines" || c === "machine") return "Machines";
  if (c === "functional" || c === "isometric") return "Functional";
  if (c === "cardio") return "Cardio";
  if (cat in CATEGORY_MAP) return cat;
  return "Free Weights";
}

interface ExerciseCategorySelectorProps {
  category: string;
  equipment: string; // Comma separated string e.g. "Plyo Box, Dumbbell"
  onChange: (category: string, equipment: string) => void;
  readOnlyCategory?: boolean;
}

export function ExerciseCategorySelector({
  category,
  equipment,
  onChange,
  readOnlyCategory = false,
}: ExerciseCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCategory = normalizeCategoryName(category);

  // Parse comma separated equipment
  const selectedEquipment = equipment 
    ? equipment.split(",").map(e => e.trim()).filter(Boolean) 
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCatOpen(false);
        setActiveTab(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addEquipment = (eq: string) => {
    if (!eq || selectedEquipment.includes(eq)) return;
    const newEq = [...selectedEquipment, eq].join(", ");
    // Note: We use the existing category prop so changing equipment doesn't affect category
    onChange(category, newEq);
    setIsOpen(false);
    setActiveTab(null);
  };

  const removeEquipment = (eqToRemove: string) => {
    const newEq = selectedEquipment.filter(e => e !== eqToRemove).join(", ");
    onChange(category, newEq);
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Pill Dropdown */}
        <div className="relative">
          {readOnlyCategory ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-white/5 border-border/80 text-foreground cursor-default select-none">
              <Folder className="size-3.5 text-brand" />
              <span>{t(currentCategory)}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsCatOpen(!isCatOpen);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                isCatOpen
                  ? "bg-brand text-brand-foreground border-brand shadow-sm"
                  : "bg-white/5 border-border/80 text-foreground hover:bg-white/10"
              )}
            >
              <Folder className="size-3.5 text-brand" />
              <span>{t(currentCategory)}</span>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </button>
          )}

          {/* Category Dropdown Popover */}
          {!readOnlyCategory && isCatOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border shadow-xl rounded-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                {t("Categorie")}
              </div>
              {Object.keys(CATEGORY_MAP).map((catKey) => {
                const isSelected = currentCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => {
                      // Change category without affecting equipment selection
                      onChange(catKey, equipment);
                      setIsCatOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-3.5 py-2 text-xs font-medium transition-colors text-left",
                      isSelected
                        ? "bg-brand/10 text-brand font-semibold"
                        : "hover:bg-muted/50 text-popover-foreground"
                    )}
                  >
                    <span>{t(catKey)}</span>
                    {isSelected && <Check className="size-3.5 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Equipment Chips */}
        {selectedEquipment.map((eq) => (
          <div 
            key={eq} 
            className="flex items-center gap-1 bg-brand/10 border border-brand/20 text-brand rounded-full px-2.5 py-1 leading-none shadow-sm"
          >
            <span className="text-xs font-semibold">{t(eq)}</span>
            <button 
              type="button" 
              onClick={() => removeEquipment(eq)}
              className="text-brand/70 hover:text-brand hover:bg-brand/20 p-0.5 rounded-full transition-colors ml-1"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* + Material Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsCatOpen(false);
            if (isOpen) setActiveTab(null);
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs leading-none font-semibold border transition-all",
            isOpen 
              ? "bg-brand text-brand-foreground border-brand shadow-md"
              : "bg-white/5 border-border/80 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          )}
        >
          <Plus className="size-3.5" />
          {selectedEquipment.length === 0 ? t("materiaal") : t("materiaal")}
        </button>
      </div>

      {/* Equipment Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {!activeTab ? (
            <div className="flex flex-col py-1">
              <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                {t("Kies materiaal categorie")}
              </div>
              {Object.keys(CATEGORY_MAP).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveTab(cat)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
                >
                  {t(cat)}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col py-1">
              <div className="flex items-center gap-2 px-2 py-2 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t(activeTab)}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {CATEGORY_MAP[activeTab as keyof typeof CATEGORY_MAP].map((eq) => {
                  const isSelected = selectedEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      disabled={isSelected}
                      onClick={() => addEquipment(eq)}
                      className={cn(
                        "w-full px-4 py-2.5 text-sm font-medium text-left transition-colors",
                        isSelected 
                          ? "opacity-50 cursor-not-allowed bg-muted/30" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      {t(eq)} {isSelected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
