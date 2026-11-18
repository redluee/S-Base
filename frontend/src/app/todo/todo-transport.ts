"use client";

import type { TodoSnapshot, TodoTask } from "@backend/types/todo";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { todoApi, type TodoApi } from "@/lib/api/todo";
import { createTodoEngine } from "./todo-engine";
import { browserStorage } from "./todo-offline-storage";

export type TodoTransport = Omit<TodoApi, "count" | "history">;

export interface TodoTransportEvents {
  onRemap: (tempId: number, task: TodoTask) => void;
  onSynced: () => void;
  onSnapshot?: (snapshot: TodoSnapshot) => void;
}

export interface TodoTransportState {
  transport: TodoTransport;
  offline: boolean;
  pending: boolean;
}

const SERVER_STATUS = { offline: false, pending: false };

export function useTodoTransport(events: TodoTransportEvents, userId: number): TodoTransportState {
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });

  const engine = useMemo(
    () =>
      createTodoEngine({
        api: todoApi,
        storage: browserStorage(userId),
        isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
        events: () => ({
          onRemap: (tempId, task) => eventsRef.current.onRemap(tempId, task),
          onSynced: () => eventsRef.current.onSynced(),
          onSnapshot: (snapshot) => eventsRef.current.onSnapshot?.(snapshot),
        }),
      }),
    [userId],
  );

  useEffect(() => {
    const sync = () => {
      engine.refreshStatus();
      void engine.sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", engine.refreshStatus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", engine.refreshStatus);
      document.removeEventListener("visibilitychange", onVisible);
      engine.dispose();
    };
  }, [engine]);

  const status = useSyncExternalStore(engine.subscribe, engine.getStatus, () => SERVER_STATUS);
  return { transport: engine.transport, offline: status.offline, pending: status.pending };
}
