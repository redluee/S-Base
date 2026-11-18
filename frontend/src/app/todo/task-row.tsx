"use client";

import type { TodoTask } from "@backend/types/todo";

export function TaskRow({ task }: { task: TodoTask }) {
  return <div className="min-h-11 truncate px-4 py-3 text-sm">{task.title}</div>;
}
