"use client";

import { useRef } from "react";
import { Flag, StickyNote } from "lucide-react";
import { agingOpacity } from "@backend/shared/todo";
import type { TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { useCompletionRow } from "./completion/completion-row";
import { dayCounter, taskColor } from "./due-label";
import { TaskBlob } from "./task-blob";
import { useTodoUi } from "./todo-ui";

export function TaskRow({ task }: { task: TodoTask }) {
  const ui = useTodoUi();
  const { complete, phase } = useCompletionRow();
  const rowRef = useRef<HTMLDivElement>(null);
  const color = taskColor(task, ui.store.categories);
  const counter = dayCounter(task.dueDate);
  const done = task.subtasks.filter((s) => s.done).length;
  const opacity = agingOpacity({
    lastEditedAt: task.lastEditedAt,
    dueDate: task.dueDate,
    sourceModule: task.link?.module ?? null,
  });

  return (
    <div ref={rowRef} className="flex min-h-11 items-center">
      <button
        type="button"
        className="group flex size-11 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={t("todo.row.complete", { title: task.title })}
        onClick={complete}
      >
        <TaskBlob color={color} filled={phase !== "idle"} />
      </button>
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 pr-3 text-left focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={t("todo.row.open", { title: task.title })}
        onClick={() => ui.openTask(task.id, rowRef.current?.getBoundingClientRect() ?? null)}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-foreground" style={{ opacity }}>
          {task.title}
        </span>
        {task.subtasks.length > 0 && (
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            aria-label={t("todo.row.subtasks", { done: String(done), total: String(task.subtasks.length) })}
          >
            {done}/{task.subtasks.length}
          </span>
        )}
        {task.notes.trim() !== "" && (
          <StickyNote className="size-3.5 shrink-0 text-muted-foreground" aria-label={t("todo.row.notes")} />
        )}
        {task.flagged && <Flag className="size-3.5 shrink-0 fill-brand text-brand" aria-label={t("todo.row.flagged")} />}
        {counter && (
          <span
            className={`shrink-0 text-xs tabular-nums ${counter.overdue ? "text-red-400/80" : "text-muted-foreground"}`}
          >
            {counter.label}
          </span>
        )}
      </button>
    </div>
  );
}
