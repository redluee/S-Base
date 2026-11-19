"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Trash2 } from "lucide-react";
import type { TodoTask } from "@backend/types/todo";
import { useTodoUi } from "../todo-ui";
import { taskColor } from "../due-label";
import { haptic } from "../haptics";
import { completionSteps, deletionDuration, FILL_MS, returningDuration, stepsEnd } from "./choreography";
import { useCompletion } from "./completion-provider";
import { collapse, paintSwipe, playReturn, type RowParts, springBack, squash, sweepWave, swipeOut } from "./row-animations";
import { prefersReducedMotion } from "./use-reduced-motion";
import { useRowSwipe } from "./use-row-swipe";

export type CompletionPhase = "idle" | "filling" | "waving" | "squashing" | "dusting" | "returning";

export interface CompletionRowApi {
  complete: () => void;
  remove: () => void;
  phase: CompletionPhase;
}

const CompletionRowContext = createContext<CompletionRowApi>({ complete: () => {}, remove: () => {}, phase: "idle" });

export function useCompletionRow(): CompletionRowApi {
  return useContext(CompletionRowContext);
}

export function CompletionRow({ task, children }: { task: TodoTask; children: ReactNode }) {
  const { store } = useTodoUi();
  const completion = useCompletion();
  const color = taskColor(task, store.categories);
  const [phase, setPhase] = useState<CompletionPhase>(() => (completion.isReturning(task.id) ? "returning" : "idle"));
  const busy = useRef(phase !== "idle");
  const timers = useRef<number[]>([]);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLSpanElement>(null);
  const tintRef = useRef<HTMLSpanElement>(null);
  const completeStripRef = useRef<HTMLDivElement>(null);
  const deleteStripRef = useRef<HTMLDivElement>(null);

  const parts = useCallback(
    (): RowParts => ({
      outer: outerRef.current,
      inner: innerRef.current,
      wave: waveRef.current,
      tint: tintRef.current,
      completeStrip: completeStripRef.current,
      deleteStrip: deleteStripRef.current,
    }),
    [],
  );

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const scheduled = timers.current;
    return () => scheduled.forEach((id) => window.clearTimeout(id));
  }, []);

  const returningOnMount = useRef(phase === "returning");

  useLayoutEffect(() => {
    if (!returningOnMount.current) return;
    completion.consumeReturning(task.id);
    playReturn(parts(), prefersReducedMotion());
    const id = window.setTimeout(() => {
      returningOnMount.current = false;
      busy.current = false;
      setPhase("idle");
    }, returningDuration());
    return () => window.clearTimeout(id);
  }, [completion, task.id, parts]);

  const runCompletion = useCallback(
    (swipeOffset = 0) => {
      if (busy.current || completion.isPending(task.id)) return;
      busy.current = true;
      haptic("pop");
      const reduced = prefersReducedMotion();
      const steps = completionSteps();
      const lead = swipeOffset ? FILL_MS : 0;
      if (swipeOffset) springBack(parts(), swipeOffset);
      completion.scheduleCompletion(task, lead + stepsEnd(steps));
      for (const step of steps) {
        after(lead + step.at, () => {
          setPhase(step.phase);
          const current = parts();
          if (step.phase === "waving") sweepWave(current.wave, reduced);
          if (step.phase === "squashing") squash(current.inner);
          if (step.phase === "dusting") {
            const rect = current.outer?.getBoundingClientRect();
            if (rect && !reduced) completion.burst(rect, color);
            collapse(current, step.duration);
          }
        });
      }
    },
    [completion, task, color, parts, after],
  );

  const runDeletion = useCallback(
    (offset: number) => {
      if (busy.current || completion.isPending(task.id)) return;
      busy.current = true;
      swipeOut(parts(), offset);
      completion.scheduleDeletion(task, deletionDuration());
    },
    [completion, task, parts],
  );

  const swipe = useRowSwipe({
    enabled: () => !busy.current,
    rowWidth: () => outerRef.current?.offsetWidth ?? 0,
    paint: (offset, visual) => paintSwipe(parts(), offset, visual, color),
    onRelease: (action, offset) => {
      if (action === "complete") runCompletion(offset);
      else if (action === "delete") runDeletion(offset);
      else springBack(parts(), offset);
    },
  });

  const api = useMemo<CompletionRowApi>(() => ({ complete: () => runCompletion(), remove: () => runDeletion(0), phase }),
    [runCompletion, runDeletion, phase],
  );

  return (
    <CompletionRowContext.Provider value={api}>
      <div ref={outerRef} className="relative touch-pan-y overflow-hidden" {...swipe}>
        <div
          ref={completeStripRef}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 flex w-0 items-center justify-start overflow-hidden pl-4 text-zinc-950 opacity-0"
          style={{ backgroundColor: color }}
        >
          <span className="flex size-6 shrink-0 items-center justify-center">
            <Check className="size-5" strokeWidth={3} />
          </span>
        </div>
        <div
          ref={deleteStripRef}
          aria-hidden="true"
          className="absolute inset-y-0 right-0 flex w-0 items-center justify-end overflow-hidden bg-destructive pr-4 text-white opacity-0"
        >
          <span className="flex size-6 shrink-0 items-center justify-center">
            <Trash2 className="size-5" />
          </span>
        </div>
        <div ref={innerRef} className="relative origin-center">
          {children}
          <span ref={tintRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" />
          <span
            ref={waveRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 origin-left opacity-0"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    </CompletionRowContext.Provider>
  );
}
