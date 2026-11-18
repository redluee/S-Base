"use client";

import { todoColorHex } from "@backend/shared/todo";
import type { TodoHistoryTask } from "@backend/types/todo";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/lang";
import { HistoryDetails } from "./history-details";
import { groupByDay } from "./history-helpers";
import { TaskCheck } from "./task-check";

interface HistoryListProps {
  items: TodoHistoryTask[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onRestore: (id: number) => void;
}

export function HistoryList({ items, hasMore, loading, onLoadMore, onRestore }: HistoryListProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const groups = useMemo(() => groupByDay(items), [items]);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = useRef(onLoadMore);
  useEffect(() => {
    loadMore.current = onLoadMore;
  });

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore.current();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="py-2 text-xs font-medium text-muted-foreground">{group.label}</h3>
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.id}>
                <div className="flex min-h-11 items-center gap-1">
                  <button
                    type="button"
                    aria-expanded={openId === item.id}
                    aria-label={`${t("todo.history.details")}: ${item.title}`}
                    onClick={() => setOpenId(openId === item.id ? null : item.id)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <TaskCheck color={todoColorHex(item.categoryColor)} checked animate={false} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestore(item.id)}
                    className="min-h-11 shrink-0 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("todo.history.restore")}
                  </button>
                </div>
                {openId === item.id ? <HistoryDetails item={item} onClose={() => setOpenId(null)} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasMore ? (
        <div ref={sentinel} className="flex min-h-11 items-center justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="min-h-11 px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {t("todo.history.loadMore")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
