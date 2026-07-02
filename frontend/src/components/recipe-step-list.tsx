"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { GripVertical, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/lang";

export interface StepRow {
  id: string;
  description: string;
}

interface RecipeStepListProps {
  steps: StepRow[];
  onChange: (newSteps: StepRow[]) => void;
}

export function RecipeStepList({ steps, onChange }: RecipeStepListProps) {
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const stepsPrevPositionsRef = useRef<Map<string, number>>(new Map());
  const [stepsReorderTick, setStepsReorderTick] = useState(0);
  const [stepDragIndex, setStepDragIndex] = useState<number | null>(null);
  const stepHoverIndexRef = useRef<number | null>(null);
  const stepDragIndexRef = useRef<number | null>(null);
  const stepNaturalPositionsRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!stepsContainerRef.current) return;
    const children = stepsContainerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const id = steps[i]?.id;
      if (id) {
        const prevTop = stepsPrevPositionsRef.current.get(id);
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
    stepsPrevPositionsRef.current.clear();
  }, [stepsReorderTick, steps]);

  function addStep() {
    const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange([...steps, { id, description: "" }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`step-desc-${id}`)?.focus();
      });
    });
  }

  function removeStep(id: string) {
    onChange(steps.filter((step) => step.id !== id));
  }

  function updateStep(id: string, value: string) {
    onChange(steps.map((step) => (step.id === id ? { ...step, description: value } : step)));
  }

  function moveStep(from: number, to: number) {
    if (to < 0 || to >= steps.length) return;

    if (stepsContainerRef.current) {
      const children = stepsContainerRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const id = steps[i]?.id;
        if (id) {
          stepsPrevPositionsRef.current.set(id, (children[i] as HTMLElement).getBoundingClientRect().top);
        }
      }
    }

    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);

    setStepsReorderTick((t) => t + 1);
  }

  function moveStepUp(i: number) {
    moveStep(i, i - 1);
  }

  function moveStepDown(i: number) {
    moveStep(i, i + 1);
  }

  function getStepDragOffset(): number {
    if (!stepsContainerRef.current || stepDragIndexRef.current === null) return 60;
    const cs = getComputedStyle(stepsContainerRef.current);
    const gap = parseFloat(cs.rowGap) || parseFloat(cs.gap) || 8;
    const el = stepsContainerRef.current.children[stepDragIndexRef.current] as HTMLElement;
    return el?.getBoundingClientRect().height + gap;
  }

  function moveStepDirect(from: number, to: number) {
    if (to < 0 || to > steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function updateStepDragVisuals() {
    const from = stepDragIndexRef.current;
    const to = stepHoverIndexRef.current;
    if (from === null || to === null || !stepsContainerRef.current) return;

    const children = stepsContainerRef.current.children;
    const offset = getStepDragOffset();

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

  function clearStepDragTransforms() {
    if (!stepsContainerRef.current) return;
    const children = stepsContainerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.style.transition = '';
      el.style.transform = '';
    }
  }

  function resetStepDragTransforms() {
    if (!stepsContainerRef.current) return;
    const children = stepsContainerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.style.transition = 'transform 150ms ease-out';
      el.style.transform = '';
    }
  }

  function handleStepDragStart(e: React.DragEvent, idx: number) {
    setStepDragIndex(idx);
    stepDragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));

    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);

    if (stepsContainerRef.current) {
      const positions: number[] = [];
      for (let i = 0; i < stepsContainerRef.current.children.length; i++) {
        const rect = stepsContainerRef.current.children[i].getBoundingClientRect();
        positions.push(rect.top + rect.height / 2);
      }
      stepNaturalPositionsRef.current = positions;
    }
  }

  function handleStepDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const from = stepDragIndexRef.current;
    if (from === null || stepNaturalPositionsRef.current.length === 0) return;

    const mouseY = e.clientY;
    let targetIndex = 0;

    for (let i = 0; i < stepNaturalPositionsRef.current.length; i++) {
      if (i === from) continue;
      if (mouseY >= stepNaturalPositionsRef.current[i]) {
        targetIndex++;
      }
    }

    if (targetIndex === stepHoverIndexRef.current) return;
    stepHoverIndexRef.current = targetIndex;
    updateStepDragVisuals();
  }

  function handleStepDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = stepDragIndexRef.current;
    const to = stepHoverIndexRef.current;

    clearStepDragTransforms();

    if (from !== null && to !== null && from !== to) {
      moveStepDirect(from, to);
    }

    setStepDragIndex(null);
    stepDragIndexRef.current = null;
    stepHoverIndexRef.current = null;
    stepNaturalPositionsRef.current = [];
  }

  function handleStepDragEnd() {
    resetStepDragTransforms();
    setStepDragIndex(null);
    stepDragIndexRef.current = null;
    stepHoverIndexRef.current = null;
    stepNaturalPositionsRef.current = [];
  }

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{t("Steps")}</h2>

      <div
        ref={stepsContainerRef}
        onDragOver={handleStepDragOver}
        onDrop={handleStepDrop}
        className="flex flex-col gap-2"
      >
        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 sm:py-8 text-center">
            {t("No steps yet.")}
          </p>
        )}
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-stretch gap-2 rounded-lg border border-border/50 bg-white/[0.02] p-2 sm:p-2.5 transition-colors hover:border-border/80 ${stepDragIndex === i ? "opacity-50" : ""}`}
          >
            <div
              className="hidden sm:flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
              draggable
              onDragStart={(e) => handleStepDragStart(e, i)}
              onDragEnd={handleStepDragEnd}
            >
              <GripVertical className="size-4 text-muted-foreground/30 pointer-events-none" />
            </div>
            <div className="flex items-center justify-center shrink-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-brand text-brand text-xs font-bold">
                {i + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex items-stretch">
              <Textarea
                id={`step-desc-${step.id}`}
                value={step.description}
                onChange={(e) => updateStep(step.id, e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                placeholder={t("Step") + ` ${i + 1}...`}
                className="min-h-[44px] h-full w-full border-0 bg-transparent px-2.5 text-sm leading-relaxed resize-none focus-visible:ring-0 pb-2.5"
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(step.id)}
                className="text-muted-foreground hover:text-red-400 hover:bg-red-950/50 transition-all active:scale-[0.92]"
              >
                <X className="size-3.5" />
              </Button>
              <div className="flex sm:hidden gap-1">
                <button
                  type="button"
                  onClick={() => moveStepUp(i)}
                  disabled={i === 0}
                  tabIndex={-1}
                  className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors hover:bg-white/5"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStepDown(i)}
                  disabled={i === steps.length - 1}
                  tabIndex={-1}
                  className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors hover:bg-white/5"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addStep}
        className="w-full mt-3 border-border transition-all active:scale-[0.97] text-xs sm:text-sm h-9 sm:h-8"
      >
        <Plus className="size-3.5" />
        {t("Add step")}
      </Button>
    </div>
  );
}
