"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { t } from "@/lib/lang";
import { CompletionRow } from "./completion/completion-row";
import { useCompletion } from "./completion/completion-provider";
import { RowEnter } from "./row-enter";
import { listSummary, taskColor } from "./due-label";
import { focusQuickAdd } from "./quick-add";
import { originFrom } from "./sheet-morph";
import { TaskCheck } from "./task-check";
import { TaskRow } from "./task-row";
import { useTodoUi, type TodoUi } from "./todo-ui";
import { useReorder } from "./use-reorder";

const FILTER_STAGGER_MS = 28;
const FILTER_STAGGER_MAX = 10;
const FILTER_SETTLE_MS = 700;

const surface = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.06]";

function startQuickAdd(ui: TodoUi, from: HTMLElement) {
  focusQuickAdd();
  ui.openQuickAdd(originFrom(from));
}

function Shortcut() {
  return (
    <kbd className="hidden rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground ring-1 ring-foreground/10 sm:inline-block">
      N
    </kbd>
  );
}

function OpenSummary() {
  const { store } = useTodoUi();
  const summary = listSummary(store.visibleTasks);
  const parts = [
    { key: "open", text: t("todo.summary.open", { count: String(summary.open) }), tone: "" },
    summary.overdue > 0 && {
      key: "overdue",
      text: t("todo.summary.overdue", { count: String(summary.overdue) }),
      tone: "text-red-400",
    },
    summary.today > 0 && {
      key: "today",
      text: t("todo.summary.today", { count: String(summary.today) }),
      tone: "text-brand",
    },
  ].filter((part) => part !== false);
  return (
    <span className="ml-3 flex shrink-0 items-center gap-x-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:mr-2">
      {parts.map((part, i) => (
        <span key={part.key} className="flex items-center gap-x-1.5">
          {i > 0 && <span aria-hidden="true">·</span>}
          <span className={part.tone}>{part.text}</span>
        </span>
      ))}
    </span>
  );
}

function AddRow() {
  const ui = useTodoUi();
  return (
    <button
      type="button"
      onClick={(e) => startQuickAdd(ui, e.currentTarget)}
      className="group flex min-h-14 w-full items-center gap-1 pr-4 pl-1 text-left text-[15px] text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex size-11 shrink-0 items-center justify-center">
        <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-dashed border-foreground/20 transition-colors group-hover:border-brand/70 group-hover:text-brand">
          <Plus className="size-3" strokeWidth={3} aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate pl-1">{t("todo.add.placeholder")}</span>
      <OpenSummary />
      <Shortcut />
    </button>
  );
}

function RecentCompleted() {
  const { store } = useTodoUi();
  if (store.recentCompleted.length === 0) return null;
  return (
    <section className="mt-10 w-full text-left" aria-label={t("todo.recent")}>
      <h2 className="px-1 pb-2 text-xs font-medium text-muted-foreground">{t("todo.recent")}</h2>
      <ul className={`${surface} divide-y divide-foreground/[0.06]`}>
        {store.recentCompleted.map((task) => (
          <li key={task.id} className="flex min-h-12 items-center gap-1 pr-4 pl-1">
            <span className="flex size-11 shrink-0 items-center justify-center">
              <TaskCheck color={taskColor(task, store.categories)} checked animate={false} />
            </span>
            <span className="min-w-0 flex-1 truncate pl-1 text-sm text-muted-foreground line-through decoration-foreground/30">
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState() {
  const ui = useTodoUi();
  const filtered = ui.store.tasks.length > 0;
  return (
    <div className="flex flex-col items-center pt-14 text-center motion-safe:animate-[todo-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)]">
      <span className="relative flex size-16 items-center justify-center rounded-full bg-brand/10 ring-1 ring-brand/25">
        <Check className="size-7 text-brand" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <p className="mt-5 text-lg font-medium text-foreground">{t(filtered ? "todo.empty.filtered" : "todo.empty")}</p>
      <p className="mt-1 max-w-[32ch] text-sm text-pretty text-muted-foreground">
        {t(filtered ? "todo.empty.filteredHint" : "todo.empty.hint")}
      </p>
      <button
        type="button"
        onClick={(e) => startQuickAdd(ui, e.currentTarget)}
        className="mt-6 flex min-h-11 items-center gap-2 rounded-full bg-foreground/[0.06] px-4 text-sm text-foreground ring-1 ring-foreground/10 transition-[background-color,scale] duration-150 hover:bg-foreground/10 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("todo.add")}
        <Shortcut />
      </button>
      {!filtered && <RecentCompleted />}
    </div>
  );
}

export function TaskList() {
  const { store } = useTodoUi();
  const completion = useCompletion();
  const { visibleTasks, actions } = store;
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = true;
  }, []);
  const filterKey = JSON.stringify(store.filter);
  const [shown, setShown] = useState({ key: filterKey, animate: false });
  if (shown.key !== filterKey) setShown({ key: filterKey, animate: true });

  useEffect(() => {
    if (!shown.animate) return;
    const id = window.setTimeout(() => setShown((s) => ({ ...s, animate: false })), FILTER_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [shown]);
  const reorder = useReorder(
    visibleTasks.map((task) => task.id),
    (id, move) => void actions.move(id, move),
  );

  if (visibleTasks.length === 0) return <EmptyState />;

  return (
    <div className={`mt-4 ${surface}`}>
      <AddRow />
      <ul key={shown.key} className="flex flex-col">
        {visibleTasks.map((task, index) => {
          const { dragging, ...props } = reorder.rowProps(task.id, index);
          return (
            <li
              key={task.id}
              {...props}
              className={`relative select-none [-webkit-touch-callout:none] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-foreground/[0.06] ${dragging ? "z-10 rounded-xl bg-[oklch(0.269_0_0)] ring-1 ring-foreground/10" : ""} ${reorder.dragging ? "cursor-grabbing" : ""}`}
            >
              <div
                className={shown.animate ? "motion-safe:animate-[todo-fade-up_280ms_cubic-bezier(0.23,1,0.32,1)_both]" : undefined}
                style={
                  shown.animate ? { animationDelay: `${Math.min(index, FILTER_STAGGER_MAX) * FILTER_STAGGER_MS}ms` } : undefined
                }
              >
                <RowEnter
                  readyRef={readyRef}
                  skip={shown.animate || completion.isReturning(task.id)}
                  color={taskColor(task, store.categories)}
                >
                  <CompletionRow task={task}>
                    <TaskRow task={task} />
                  </CompletionRow>
                </RowEnter>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
