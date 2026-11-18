"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TodoTask } from "@backend/types/todo";
import { useTodoUi } from "../todo-ui";
import { haptic } from "../haptics";
import { DUST_MS, RETURN_WINDOW_MS } from "./choreography";
import { DustLayer, type DustBurstData } from "./dust";
import { dustParticles, type DustRect } from "./dust-particles";
import { useUndoStack } from "./use-undo-stack";

export interface CompletionApi {
  scheduleCompletion: (task: TodoTask, delayMs: number) => void;
  scheduleDeletion: (task: TodoTask, delayMs: number) => void;
  isPending: (id: number) => boolean;
  isReturning: (id: number) => boolean;
  consumeReturning: (id: number) => void;
  burst: (rect: DustRect, color: string) => void;
}

export interface UndoApi {
  visible: boolean;
  seconds: number;
  run: () => void;
}

const CompletionContext = createContext<CompletionApi | null>(null);
const UndoContext = createContext<UndoApi>({ visible: false, seconds: 0, run: () => {} });

export function useUndo(): UndoApi {
  return useContext(UndoContext);
}

export function useCompletion(): CompletionApi {
  const api = useContext(CompletionContext);
  if (!api) throw new Error("useCompletion must be used inside CompletionProvider");
  return api;
}

export function CompletionProvider({ children }: { children: ReactNode }) {
  const { store } = useTodoUi();
  const actionsRef = useRef(store.actions);
  const pending = useRef(new Map<number, { timer: number; commit: () => void }>());
  const returning = useRef(new Map<number, number>());
  const burstId = useRef(0);
  const [bursts, setBursts] = useState<DustBurstData[]>([]);
  const undoStack = useUndoStack();
  const { push, pop } = undoStack;

  useEffect(() => {
    actionsRef.current = store.actions;
  });

  useEffect(() => {
    const scheduled = pending.current;
    return () => {
      for (const { timer, commit } of scheduled.values()) {
        window.clearTimeout(timer);
        commit();
      }
      scheduled.clear();
    };
  }, []);

  const schedule = useCallback((id: number, delayMs: number, work: () => Promise<void>) => {
    if (pending.current.has(id)) return;
    const commit = () => {
      pending.current.delete(id);
      void work();
    };
    pending.current.set(id, { timer: window.setTimeout(commit, delayMs), commit });
  }, []);

  const scheduleCompletion = useCallback(
    (task: TodoTask, delayMs: number) =>
      schedule(task.id, delayMs, async () => {
        const done = await actionsRef.current.complete(task.id);
        if (done) push({ kind: "complete", task: done });
      }),
    [schedule, push],
  );

  const scheduleDeletion = useCallback(
    (task: TodoTask, delayMs: number) =>
      schedule(task.id, delayMs, async () => {
        const removed = await actionsRef.current.remove(task.id);
        if (removed) push({ kind: "delete", task: removed });
      }),
    [schedule, push],
  );

  const burst = useCallback((rect: DustRect, color: string) => {
    burstId.current += 1;
    const next = { id: burstId.current, color, particles: dustParticles(rect, DUST_MS) };
    setBursts((current) => [...current, next]);
  }, []);

  const dropBurst = useCallback((id: number) => setBursts((current) => current.filter((b) => b.id !== id)), []);

  const runUndo = useCallback(() => {
    const entry = pop();
    if (!entry) return;
    haptic("tick");
    if (entry.kind === "complete") {
      returning.current.set(entry.task.id, Date.now() + RETURN_WINDOW_MS);
      void actionsRef.current.uncomplete(entry.task);
    } else {
      void actionsRef.current.undelete(entry.task);
    }
  }, [pop]);

  const api = useMemo<CompletionApi>(
    () => ({
      scheduleCompletion,
      scheduleDeletion,
      isPending: (id) => pending.current.has(id),
      isReturning: (id) => (returning.current.get(id) ?? 0) > Date.now(),
      consumeReturning: (id) => void returning.current.delete(id),
      burst,
    }),
    [scheduleCompletion, scheduleDeletion, burst],
  );

  const undo = useMemo<UndoApi>(
    () => ({ visible: undoStack.visible, seconds: undoStack.seconds, run: runUndo }),
    [undoStack.visible, undoStack.seconds, runUndo],
  );

  return (
    <CompletionContext.Provider value={api}>
      <UndoContext.Provider value={undo}>
        {children}
        <DustLayer bursts={bursts} onDone={dropBurst} />
      </UndoContext.Provider>
    </CompletionContext.Provider>
  );
}
