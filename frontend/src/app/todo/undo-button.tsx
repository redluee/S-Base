"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { t } from "@/lib/lang";
import { useUndo } from "./completion/completion-provider";

export function UndoButton() {
  const { visible, seconds, run } = useUndo();
  const [shown, setShown] = useState(seconds);
  if (visible && seconds !== shown) setShown(seconds);

  return (
    <button
      type="button"
      onClick={run}
      aria-label={t("todo.undo")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`flex h-14 min-w-14 items-center gap-2 rounded-full bg-card px-4 text-foreground transition-[translate,scale,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95 motion-reduce:transition-opacity ${
        visible
          ? "translate-y-0 scale-100 opacity-100 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          : "pointer-events-none -translate-x-6 translate-y-2 scale-90 opacity-0 duration-200 ease-in"
      }`}
    >
      <Undo2 className="size-5" aria-hidden="true" />
      <span className="text-sm tabular-nums text-muted-foreground">
        {t("todo.undo.countdown", { seconds: String(shown) })}
      </span>
    </button>
  );
}
