"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ExerciseCategorySelector } from "@/app/workouts/(main)/exercises/exercise-category-selector";
import { exerciseTagLabels } from "@/app/workouts/session/workout-exercise-card-utils";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";

interface ExerciseTagsProps {
  category: string;
  equipment: string;
  isAssisted: boolean;
  hasSets: boolean;
  onChange: (category: string, equipment: string) => void;
  onToggleAssisted: (val: boolean) => void;
}

export function ExerciseTags({ category, equipment, isAssisted, hasSets, onChange, onToggleAssisted }: ExerciseTagsProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const labels = exerciseTagLabels(category, equipment, isAssisted);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !expanded) return;
    event.stopPropagation();
    setExpanded(false);
    toggleRef.current?.focus();
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={cn(expanded || hasSets ? "mb-4" : "mb-5")}>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${t("Manage category and equipment")}: ${labels.join(", ")}`}
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "relative flex w-full items-center gap-1.5 rounded-md text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          expanded ? "min-h-11" : "min-h-6 after:absolute after:inset-x-0 after:top-0 after:-bottom-5 after:content-['']"
        )}
      >
        <span className="min-w-0">{labels.join(" · ")}</span>
        <Chevron className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!expanded}>
        {expanded && (
          <ExerciseCategorySelector
            category={category}
            equipment={equipment}
            readOnlyCategory={true}
            onChange={onChange}
            isAssisted={isAssisted}
            onToggleAssisted={onToggleAssisted}
          />
        )}
      </div>
    </div>
  );
}
