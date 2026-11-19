"use client";

import { useRef } from "react";
import { ChevronRight, Flag, ListChecks, Link2, StickyNote, Trash2 } from "lucide-react";
import { agingOpacity } from "@backend/shared/todo";
import type { TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { useCompletionRow } from "./completion/completion-row";
import { dueBadge, taskColor, type DueTone } from "./due-label";
import { CategoryIcon } from "./category-icon";
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
  const { complete, remove, phase } = useCompletionRow();
  const rowRef = useRef<HTMLDivElement>(null);
  const { categories, projects, filter } = ui.store;
  const color = taskColor(task, categories);
  const due = dueBadge(task.dueDate);
  const done = task.subtasks.filter((s) => s.done).length;
  const category = categories.find((c) => c.id === task.categoryId);
  const project = task.projectId === null ? undefined : projects.find((p) => p.id === task.projectId);
  const filteringCategory = filter.kind === "category" && filter.categoryId === category?.id;
  const showCategory = category !== undefined && !filteringCategory;
  const showProject = project !== undefined && !(filteringCategory && filter.projectId === project.id);
  const hasNotes = task.notes.trim() !== "";
  const hasMeta =
    due !== null || showCategory || showProject || task.subtasks.length > 0 || hasNotes || task.link !== null;
  const opacity = agingOpacity({
    lastEditedAt: task.lastEditedAt,
    dueDate: task.dueDate,
    sourceModule: task.link?.module ?? null,
  });

  return (
    <div ref={rowRef} className="group/row flex min-h-14 items-center pr-1 pl-1">
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
        onKeyDown={(e) => {
          if (e.key !== "Delete") return;
          e.preventDefault();
          remove();
        }}
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
              {category && (showCategory || showProject) && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <CategoryIcon icon={category.icon} color={color} className="size-3" />
                  {showCategory && <span className="min-w-0 truncate">{category.name}</span>}
                  {showCategory && showProject && (
                    <ChevronRight className="-mx-0.5 size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                  )}
                  {showProject && <span className="min-w-0 truncate">{project.name}</span>}
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
      <button
        type="button"
        aria-label={t("todo.row.delete", { title: task.title })}
        title={t("todo.row.deleteHint")}
        onClick={remove}
        className="hidden size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[opacity,color] duration-150 group-hover/row:opacity-100 hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand [@media(hover:hover)_and_(pointer:fine)]:flex"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
