"use client";

import { useEffect, useRef } from "react";
import { focusQuickAdd } from "./quick-add";
import type { TodoUi } from "./todo-ui";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function useTodoKeys(ui: TodoUi): void {
  const ref = useRef(ui);
  useEffect(() => {
    ref.current = ui;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = ref.current;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "n" || isTyping(event.target) || current.overlayOpen) return;
      event.preventDefault();
      focusQuickAdd();
      current.openQuickAdd("instant");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
