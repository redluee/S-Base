"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TodoTask } from "@backend/types/todo";
import { useTodoUi } from "../todo-ui";

export type CompletionPhase = "idle" | "filling" | "waving" | "squashing" | "dusting" | "returning";

export interface CompletionRowApi {
  complete: () => void;
  phase: CompletionPhase;
}

const CompletionRowContext = createContext<CompletionRowApi>({ complete: () => {}, phase: "idle" });

export function useCompletionRow(): CompletionRowApi {
  return useContext(CompletionRowContext);
}

export function CompletionRow({ task, children }: { task: TodoTask; children: ReactNode }) {
  const { store } = useTodoUi();
  const api: CompletionRowApi = { complete: () => void store.actions.complete(task.id), phase: "idle" };
  return <CompletionRowContext.Provider value={api}>{children}</CompletionRowContext.Provider>;
}
