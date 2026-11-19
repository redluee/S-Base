"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/lang";
import { HistoryFilters } from "./history-filters";
import { HistoryList } from "./history-list";
import { PulseGraph } from "./pulse-graph";
import { filterPreselection } from "./todo-state";
import { useTodoUi } from "./todo-ui";
import { type HistoryParams, useHistory } from "./use-history";

const SEARCH_DEBOUNCE_MS = 250;

export function HistoryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <HistoryPanel onClose={onClose} /> : null;
}

function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { store } = useTodoUi();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Pick<HistoryParams, "categoryId" | "projectId">>(() =>
    filterPreselection(store.filter),
  );

  useEffect(() => {
    const timer = setTimeout(() => setQ(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const params: HistoryParams = { q, ...scope };
  const history = useHistory(params);

  const filtering = q.trim() !== "" || scope.categoryId !== null;
  const restore = async (id: number) => {
    if (await store.actions.restore(id)) history.removeItem(id);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t("todo.history.title")} className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pb-16 lg:max-w-[880px]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background py-2">
          <h2 className="text-lg font-medium">{t("todo.history.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("todo.history.close")}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>
        <PulseGraph points={history.pulse} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("todo.history.search")}
          aria-label={t("todo.history.search")}
          className="min-h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base outline-none focus:border-ring"
        />
        <HistoryFilters
          categories={store.categories}
          projects={store.projects}
          value={params}
          onChange={(patch) => setScope((current) => ({ ...current, ...patch }))}
        />
        {history.error ? <p className="text-sm text-destructive">{history.error}</p> : null}
        {history.loaded && history.items.length === 0 && !history.error ? (
          <p className="py-8 text-center text-muted-foreground">
            {filtering ? t("todo.history.noResults") : t("todo.history.empty")}
          </p>
        ) : null}
        <HistoryList
          items={history.items}
          hasMore={history.hasMore}
          loading={history.loading}
          onLoadMore={history.loadMore}
          onRestore={restore}
        />
      </div>
    </div>
  );
}
