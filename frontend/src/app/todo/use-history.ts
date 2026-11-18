"use client";

import type { TodoHistoryTask, TodoPulsePoint } from "@backend/types/todo";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { mergeItems } from "./history-helpers";

export interface HistoryParams {
  q: string;
  categoryId: number | null;
  projectId: number | null;
}

interface HistoryState {
  key: string;
  items: TodoHistoryTask[];
  cursor: string | null;
  error: string | null;
  loadingMore: boolean;
}

function scope(params: HistoryParams) {
  return {
    ...(params.categoryId !== null ? { categoryId: params.categoryId } : {}),
    ...(params.projectId !== null ? { projectId: params.projectId } : {}),
  };
}

function listQuery(params: HistoryParams) {
  return { ...scope(params), ...(params.q.trim() ? { q: params.q.trim() } : {}) };
}

export function useHistory(params: HistoryParams) {
  const { q, categoryId, projectId } = params;
  const key = JSON.stringify([q.trim(), categoryId, projectId]);
  const [state, setState] = useState<HistoryState | null>(null);
  const [pulseState, setPulseState] = useState<{ key: string; points: TodoPulsePoint[] } | null>(null);
  const busy = useRef(false);
  const latestKey = useRef(key);

  useEffect(() => {
    latestKey.current = key;
    busy.current = false;
    const query = listQuery({ q, categoryId, projectId });
    api.todo.history
      .list(query)
      .then((page) => {
        if (latestKey.current === key) {
          setState({ key, items: page.items, cursor: page.nextCursor, error: null, loadingMore: false });
        }
      })
      .catch((err) => {
        if (latestKey.current === key) {
          setState({ key, items: [], cursor: null, error: apiErrorMessage(err, "todo.loadFailed"), loadingMore: false });
        }
      });
  }, [key, q, categoryId, projectId]);

  useEffect(() => {
    api.todo.history
      .pulse(scope({ q, categoryId, projectId }))
      .then((points) => {
        if (latestKey.current === key) setPulseState({ key, points });
      })
      .catch(() => {});
  }, [key, q, categoryId, projectId]);

  const current = state?.key === key ? state : null;
  const cursor = current?.cursor ?? null;

  const loadMore = useCallback(() => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setState((s) => (s && s.key === key ? { ...s, loadingMore: true } : s));
    api.todo.history
      .list({ ...listQuery({ q, categoryId, projectId }), cursor })
      .then((page) => {
        if (latestKey.current !== key) return;
        setState((s) =>
          s && s.key === key
            ? { ...s, items: mergeItems(s.items, page.items), cursor: page.nextCursor, loadingMore: false }
            : s,
        );
      })
      .catch((err) => {
        if (latestKey.current !== key) return;
        setState((s) =>
          s && s.key === key ? { ...s, error: apiErrorMessage(err, "todo.loadFailed"), loadingMore: false } : s,
        );
      })
      .finally(() => {
        busy.current = false;
      });
  }, [cursor, key, q, categoryId, projectId]);

  const removeItem = useCallback((taskId: number) => {
    setState((s) => (s ? { ...s, items: s.items.filter((item) => item.id !== taskId) } : s));
  }, []);

  return {
    items: current?.items ?? [],
    hasMore: cursor !== null,
    loading: current === null || current.loadingMore,
    loaded: current !== null,
    error: current?.error ?? null,
    pulse: pulseState?.points ?? [],
    loadMore,
    removeItem,
  };
}
