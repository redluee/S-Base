"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, Lock, X } from "lucide-react";
import type { TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { createDebouncedSaver } from "./block-motion";
import { CategoryChips } from "./category-chips";
import { DuePicker } from "./due-picker";
import { taskColor } from "./due-label";
import { NotesField } from "./notes-field";
import { sourceHref } from "./source-link";
import { SubtaskList } from "./subtask-list";
import { useTodoUi } from "./todo-ui";
import { useBlockMorph } from "./use-block-morph";

interface Props {
  taskId: number | null;
  origin: DOMRect | null;
  onClose: () => void;
}

export function TaskBlock({ taskId, origin, onClose }: Props) {
  const { store } = useTodoUi();
  const task = taskId === null ? undefined : store.tasks.find((candidate) => candidate.id === taskId);
  const gone = taskId !== null && !task;

  useEffect(() => {
    if (gone) onClose();
  }, [gone, onClose]);

  if (!task) return null;
  return <BlockCard key={task.id} task={task} origin={origin} onClose={onClose} />;
}

function TitleField({ task, locked }: { task: TodoTask; locked: boolean }) {
  const { store } = useTodoUi();
  const [title, setTitle] = useState(task.title);
  const lastSaved = useRef(task.title);
  const saver = useRef<ReturnType<typeof createDebouncedSaver<string>> | null>(null);
  const update = useRef(store.actions.update);
  const id = task.id;

  useEffect(() => {
    update.current = store.actions.update;
  });

  useEffect(() => {
    const instance = createDebouncedSaver<string>((value) => {
      const next = value.replace(/\s+/g, " ").trim();
      if (!next || next === lastSaved.current) return;
      lastSaved.current = next;
      void update.current(id, { title: next });
    }, 400);
    saver.current = instance;
    return () => instance.flush();
  }, [id]);

  useEffect(() => {
    if (task.title !== lastSaved.current) {
      lastSaved.current = task.title;
      setTitle(task.title);
    }
  }, [task.title]);

  return (
    <textarea
      value={title}
      rows={1}
      maxLength={200}
      readOnly={locked}
      aria-label={t("todo.block.title")}
      onChange={(e) => {
        const value = e.target.value.replace(/\n/g, " ");
        setTitle(value);
        saver.current?.schedule(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        saver.current?.flush();
        if (!title.trim()) setTitle(lastSaved.current);
      }}
      className="min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2 text-lg leading-7 font-medium text-pretty text-foreground outline-none field-sizing-content"
    />
  );
}

function BlockCard({ task, origin, onClose }: { task: TodoTask; origin: DOMRect | null; onClose: () => void }) {
  const { store } = useTodoUi();
  const { card, backdrop, content, close, grabber } = useBlockMorph({
    origin,
    beforeClose: () => (document.activeElement as HTMLElement | null)?.blur(),
    onClosed: onClose,
  });
  const color = taskColor(task, store.categories);
  const locked = task.link !== null;
  const href = task.link ? sourceHref(task.link) : null;
  const category = store.categories.find((c) => c.id === task.categoryId);
  const project = store.projects.find((p) => p.id === task.projectId);
  const patch = (values: Parameters<typeof store.actions.update>[1]) => void store.actions.update(task.id, values);

  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={backdrop}
        aria-hidden
        onClick={() => close()}
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-4">
        <div
          ref={card}
          role="dialog"
          aria-modal="true"
          aria-label={task.title}
          className="pointer-events-auto flex max-h-[88dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-card"
        >
          <div
            {...grabber}
            className="flex h-6 shrink-0 touch-none cursor-grab items-center justify-center sm:hidden"
            aria-hidden
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
          </div>
          <div ref={content} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-5 sm:pt-4">
            <div className="flex items-start gap-1">
              <span className="mt-4 mr-2 size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <TitleField task={task} locked={locked} />
              <button
                type="button"
                aria-pressed={task.flagged}
                aria-label={task.flagged ? t("todo.block.unflag") : t("todo.block.flag")}
                onClick={() => patch({ flagged: !task.flagged })}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  task.flagged ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Flag className="size-5" fill={task.flagged ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                aria-label={t("todo.block.close")}
                onClick={() => close()}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {locked ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                  {t("todo.block.locked")}
                </p>
                <p className="text-foreground">
                  {[category?.name, project?.name].filter(Boolean).join(" / ")}
                </p>
              </div>
            ) : (
              <CategoryChips
                value={{ categoryId: task.categoryId, projectId: task.projectId }}
                onChange={(value) => patch({ categoryId: value.categoryId, projectId: value.projectId })}
              />
            )}
            <DuePicker
              value={task.dueDate}
              disabled={locked}
              emptyLabel={t("todo.date.pick")}
              onChange={(dueDate) => patch({ dueDate })}
            />

            <SubtaskList task={task} color={color} />

            <section aria-label={t("todo.block.notes")}>
              <h3 className="px-1 pb-1 text-xs text-muted-foreground">{t("todo.block.notes")}</h3>
              <NotesField value={task.notes} onSave={(notes) => patch({ notes })} />
            </section>

            {href && task.link && (
              <Link
                href={href}
                className="flex min-h-11 items-center text-sm text-brand underline underline-offset-2"
              >
                {t("todo.block.source", { module: t(`todo.source.${task.link.module}`) })}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
