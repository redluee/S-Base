"use client";

import type { TodoTask } from "@backend/types/todo";
import { todoApi, type TodoApi } from "@/lib/api/todo";

export type TodoTransport = Omit<TodoApi, "count" | "history">;

export interface TodoTransportEvents {
  onRemap: (tempId: number, task: TodoTask) => void;
  onSynced: () => void;
}

export interface TodoTransportState {
  transport: TodoTransport;
  offline: boolean;
  pending: boolean;
}

const online: TodoTransportState = { transport: todoApi, offline: false, pending: false };

export function useTodoTransport(_events: TodoTransportEvents): TodoTransportState {
  return online;
}
