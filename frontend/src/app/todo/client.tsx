"use client";

import { useMemo, useState } from "react";
import { CloudOff, History, Plus, Settings } from "lucide-react";
import type { TodoSnapshot } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useTodoStore } from "./use-todo-store";
import { TodoUiContext, type TodoUi } from "./todo-ui";
import { Counter } from "./counter";
import { FilterChips } from "./filter-chips";
import { TaskList } from "./task-list";
import { QuickAdd } from "./quick-add";
import { TaskBlock } from "./task-block";
import { HistoryOverlay } from "./history-overlay";
import { ManageSheet } from "./manage-sheet";
import { UndoButton } from "./undo-button";
import { CompletionProvider } from "./completion/completion-provider";
import { useTodoKeys } from "./use-todo-keys";

type Overlay = { kind: "none" } | { kind: "quickAdd" } | { kind: "history" } | { kind: "manage" };

const iconButton =
  "flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand";

export function TodoClient({ initial }: { initial: TodoSnapshot | null }) {
  const store = useTodoStore(initial);
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const [openTask, setOpenTask] = useState<{ id: number; origin: DOMRect | null } | null>(null);

  const ui = useMemo<TodoUi>(
    () => ({
      store,
      openTask: (id, origin) => setOpenTask({ id, origin }),
      openQuickAdd: () => setOverlay({ kind: "quickAdd" }),
      openHistory: () => setOverlay({ kind: "history" }),
      openManage: () => setOverlay({ kind: "manage" }),
      closeOverlays: () => {
        setOverlay({ kind: "none" });
        setOpenTask(null);
      },
      overlayOpen: overlay.kind !== "none" || openTask !== null,
    }),
    [store, overlay.kind, openTask],
  );

  useTodoKeys(ui);
  const close = () => setOverlay({ kind: "none" });

  return (
    <TodoUiContext.Provider value={ui}>
      <CompletionProvider>
        <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[640px] flex-col px-4 pt-4 pb-32">
          <header className="flex items-center justify-between gap-2">
            <h1 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">{t("todo.title")}</h1>
            <div className="flex items-center">
              {(store.offline || store.pending) && (
                <span className="flex size-11 items-center justify-center text-muted-foreground" title={t("todo.header.offline")}>
                  <CloudOff className="size-4" aria-label={t("todo.header.offline")} />
                </span>
              )}
              <Counter value={store.completedCount} />
              <button type="button" className={iconButton} onClick={ui.openHistory} aria-label={t("todo.header.history")}>
                <History className="size-5" />
              </button>
              <button type="button" className={iconButton} onClick={ui.openManage} aria-label={t("todo.header.manage")}>
                <Settings className="size-5" />
              </button>
            </div>
          </header>

          {store.error && (
            <button type="button" className="mt-3 block w-full text-left" onClick={store.actions.clearError}>
              <InlineAlert>{store.error}</InlineAlert>
            </button>
          )}

          <FilterChips />

          {store.status === "loading" ? (
            <p role="status" className="mt-8 text-center text-sm text-muted-foreground">
              {t("todo.loading")}
            </p>
          ) : (
            <TaskList />
          )}

          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[640px] items-end justify-between px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto">
              <UndoButton />
            </div>
            <button
              type="button"
              onClick={ui.openQuickAdd}
              aria-label={t("todo.add")}
              className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-brand text-zinc-900 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>

        <QuickAdd open={overlay.kind === "quickAdd"} onClose={close} />
        <ManageSheet open={overlay.kind === "manage"} onClose={close} />
        <HistoryOverlay open={overlay.kind === "history"} onClose={close} />
        <TaskBlock taskId={openTask?.id ?? null} origin={openTask?.origin ?? null} onClose={() => setOpenTask(null)} />
      </CompletionProvider>
    </TodoUiContext.Provider>
  );
}
