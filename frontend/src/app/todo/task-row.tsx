"use client";

import { useRef } from "react";
import { Flag, ListChecks, Link2, StickyNote } from "lucide-react";
import { agingOpacity } from "@backend/shared/todo";
import type { TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { useCompletionRow } from "./completion/completion-row";
import { dueBadge, taskColor, type DueTone } from "./due-label";
import { TaskCheck } from "./task-check";
import { useTodoUi } from "./todo-ui";

const TONE: Record<DueTone, string> = {
  overdue: "text-red-400",
  today: "text-brand",
  soon: "text-foreground/80",
  later: "text-muted-foreground",
};

export function TaskRow({ task }: { task: TodoTask }) {
  const ui = useTodoUi();
  const { complete, phase } = useCompletionRow();
  const rowRef = useRef<HTMLDivElement>(null);
  const { categories, filter } = ui.store;
  const color = taskColor(task, categories);
  const due = dueBadge(task.dueDate);
  const done = task.subtasks.filter((s) => s.done).length;
  const category = categories.find((c) => c.id === task.categoryId);
  const showCategory = category !== undefined && !(filter.kind === "category" && filter.categoryId === category.id);
  const hasNotes = task.notes.trim() !== "";
  const hasMeta = due !== null || showCategory || task.subtasks.length > 0 || hasNotes || task.link !== null;
  const opacity = agingOpacity({
    lastEditedAt: task.lastEditedAt,
    dueDate: task.dueDate,
    sourceModule: task.link?.module ?? null,
  });

  return (
    <div ref={rowRef} className="flex min-h-14 items-center pr-1 pl-1">
      <button
        type="button"
        className="group flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={t("todo.row.complete", { title: task.title })}
        onClick={complete}
      >
        <TaskCheck color={color} checked={phase !== "idle"} />
      </button>
      <button
        type="button"
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-3 pl-1 text-left focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={t("todo.row.open", { title: task.title })}
        onClick={() => ui.openTask(task.id, rowRef.current?.getBoundingClientRect() ?? null)}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5" style={{ opacity }}>
          <span
            className={cn(
              "truncate text-[15px] leading-snug text-foreground transition-colors duration-200",
              phase !== "idle" && "text-muted-foreground",
            )}
          >
            {task.title}
          </span>
          {hasMeta && (
            <span className="flex min-w-0 items-center gap-x-3 text-xs leading-4 text-muted-foreground">
              {due && <span className={cn("shrink-0 font-medium", TONE[due.tone])}>{due.label}</span>}
              {showCategory && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate">{category.name}</span>
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span
                  className="flex shrink-0 items-center gap-1 tabular-nums"
                  aria-label={t("todo.row.subtasks", { done: String(done), total: String(task.subtasks.length) })}
                >
                  <ListChecks className="size-3.5" aria-hidden="true" />
                  {done}/{task.subtasks.length}
                </span>
              )}
              {hasNotes && <StickyNote className="size-3.5 shrink-0" aria-label={t("todo.row.notes")} />}
              {task.link && <Link2 className="size-3.5 shrink-0" aria-label={t(`todo.source.${task.link.module}`)} />}
            </span>
          )}
        </span>
        {task.flagged && <Flag className="size-4 shrink-0 fill-brand text-brand" aria-label={t("todo.row.flagged")} />}
      </button>
    </div>
  );
}
