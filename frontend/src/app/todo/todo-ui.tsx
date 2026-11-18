"use client";

import { createContext, useContext } from "react";
import type { SheetOrigin } from "./sheet-morph";
import type { TodoStore } from "./use-todo-store";

export interface TodoUi {
  store: TodoStore;
  openTask: (id: number, origin: DOMRect | null) => void;
  openQuickAdd: (origin: SheetOrigin | "instant") => void;
  openHistory: () => void;
  openManage: () => void;
  closeOverlays: () => void;
  overlayOpen: boolean;
}

export const TodoUiContext = createContext<TodoUi | null>(null);

export function useTodoUi(): TodoUi {
  const ui = useContext(TodoUiContext);
  if (!ui) throw new Error("useTodoUi must be used inside TodoUiContext");
  return ui;
}
