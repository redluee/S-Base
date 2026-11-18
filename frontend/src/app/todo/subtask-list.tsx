"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { TodoTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { arrayMove, moveForReorder, reorderIndex } from "./block-motion";
import { haptic } from "./haptics";
import { SubtaskRow, type HandleProps } from "./subtask-row";
import { useTodoUi } from "./todo-ui";

interface Props {
  task: TodoTask;
  color: string;
}

export function SubtaskList({ task, color }: Props) {
  const { store } = useTodoUi();
  const actions = store.actions.subtasks;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [order, setOrder] = useState<number[] | null>(null);
  const [drag, setDrag] = useState<{ id: number; dy: number } | null>(null);
  const rows = useRef(new Map<number, HTMLDivElement>());
  const dragStart = useRef<{ id: number; y: number } | null>(null);
  const addInput = useRef<HTMLInputElement>(null);

  const byId = new Map(task.subtasks.map((s) => [s.id, s]));
  const shown = order ? order.map((id) => byId.get(id)).filter((s) => s !== undefined) : task.subtasks;
  const done = task.subtasks.filter((s) => s.done).length;

  const submit = async (keepOpen: boolean) => {
    const title = draft.trim();
    if (!title) {
      setAdding(false);
      return;
    }
    const afterId = task.subtasks.at(-1)?.id ?? null;
    setDraft("");
    if (keepOpen) addInput.current?.focus();
    await actions.create(task.id, title, afterId);
  };

  const handleFor = (id: number): HandleProps => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { id, y: e.clientY };
      haptic("tick");
      setDrag({ id, dy: 0 });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const start = dragStart.current;
      if (start?.id === id) setDrag({ id, dy: e.clientY - start.y });
    },
    onPointerUp: () => {
      dragStart.current = null;
      setDrag(null);
      const ids = shown.map((s) => s.id);
      const el = rows.current.get(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centers = ids
        .filter((other) => other !== id)
        .map((other) => {
          const r = rows.current.get(other)?.getBoundingClientRect();
          return r ? r.top + r.height / 2 : 0;
        });
      const to = reorderIndex(centers, rect.top + rect.height / 2);
      const from = ids.indexOf(id);
      const move = moveForReorder(ids, from, to);
      if (!move) return;
      haptic("tick");
      setOrder(arrayMove(ids, from, to));
      void actions.move(id, move).finally(() => setOrder(null));
    },
    onPointerCancel: () => {
      dragStart.current = null;
      setDrag(null);
    },
  });

  return (
    <section aria-label={t("todo.block.subtasks")}>
      {task.subtasks.length > 0 && (
        <p className="px-1 pb-1 text-xs text-muted-foreground tabular-nums">
          {t("todo.block.subtasks")} · {done}/{task.subtasks.length}
        </p>
      )}
      <div className="flex flex-col">
        {shown.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            color={color}
            dragOffset={drag?.id === subtask.id ? drag.dy : null}
            handle={handleFor(subtask.id)}
            rowRef={(el) => {
              if (el) rows.current.set(subtask.id, el);
              else rows.current.delete(subtask.id);
            }}
            onToggle={(next) => void actions.update(subtask.id, { done: next })}
            onTitle={(title) => void actions.update(subtask.id, { title })}
            onRemove={() => void actions.remove(subtask.id)}
          />
        ))}
      </div>
      {adding ? (
        <input
          ref={addInput}
          autoFocus
          value={draft}
          maxLength={200}
          placeholder={t("todo.block.subtaskPlaceholder")}
          aria-label={t("todo.block.subtaskPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit(true);
            } else if (e.key === "Escape" && !draft) {
              e.stopPropagation();
              setAdding(false);
            }
          }}
          onBlur={() => {
            if (draft.trim()) void submit(false);
            setAdding(false);
          }}
          className="mt-1 min-h-11 w-full rounded-lg bg-muted px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-brand"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 flex min-h-11 w-full items-center rounded-lg px-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
        >
          {t("todo.block.addSubtask")}
        </button>
      )}
    </section>
  );
}
