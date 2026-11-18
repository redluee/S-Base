"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TodoColor } from "@backend/shared/todo";
import type {
  TodoCategory,
  TodoMove,
  TodoProject,
  TodoSnapshot,
  TodoSubtask,
  TodoTask,
  TodoTaskInput,
  TodoTaskPatch,
} from "@backend/types/todo";
import { apiErrorMessage } from "@/lib/api";
import {
  ALL_TASKS,
  emptyState,
  filterTasks,
  fromSnapshot,
  moveTask,
  patchSubtasks,
  patchTask,
  removeCategoryLocally,
  removeProjectLocally,
  removeTask,
  replaceTaskId,
  taskOfSubtask,
  toggleFilter,
  upsertTask,
  validFilter,
  type TodoFilter,
  type TodoState,
} from "./todo-state";
import { useTodoTransport } from "./todo-transport";

export type TodoStatus = "loading" | "ready" | "error";

export interface TodoActions {
  refresh: () => Promise<void>;
  setFilter: (filter: TodoFilter) => void;
  toggleFilter: (filter: TodoFilter) => void;
  create: (input: TodoTaskInput) => Promise<TodoTask | null>;
  update: (id: number, patch: TodoTaskPatch) => Promise<TodoTask | null>;
  move: (id: number, move: TodoMove) => Promise<void>;
  complete: (id: number) => Promise<TodoTask | null>;
  uncomplete: (task: TodoTask) => Promise<void>;
  remove: (id: number) => Promise<TodoTask | null>;
  undelete: (task: TodoTask) => Promise<void>;
  restore: (id: number) => Promise<boolean>;
  subtasks: {
    create: (taskId: number, title: string, afterId?: number | null) => Promise<TodoSubtask | null>;
    update: (id: number, patch: { title?: string; done?: boolean }) => Promise<void>;
    move: (id: number, move: TodoMove) => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
  categories: {
    create: (input: { name: string; color: TodoColor }) => Promise<TodoCategory | null>;
    update: (id: number, patch: { name?: string; color?: TodoColor }) => Promise<void>;
    reorder: (ids: number[]) => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
  projects: {
    create: (input: { categoryId: number; name: string }) => Promise<TodoProject | null>;
    update: (id: number, name: string) => Promise<void>;
    reorder: (categoryId: number, ids: number[]) => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
  clearError: () => void;
}

export interface TodoStore extends TodoState {
  status: TodoStatus;
  error: string | null;
  offline: boolean;
  pending: boolean;
  visibleTasks: TodoTask[];
  actions: TodoActions;
}

const now = () => new Date().toISOString();

export function useTodoStore(initial: TodoSnapshot | null, userId: number): TodoStore {
  const [state, setState] = useState<TodoState>(() => (initial ? fromSnapshot(initial, ALL_TASKS) : emptyState()));
  const [status, setStatus] = useState<TodoStatus>(initial ? "ready" : "loading");
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const { transport, offline, pending } = useTodoTransport({
    onRemap: (tempId, task) => setState((s) => ({ ...s, tasks: replaceTaskId(s.tasks, tempId, task) })),
    onSynced: () => void refreshRef.current(),
  }, userId);

  const load = useCallback(
    () =>
      transport.snapshot().then(
        (snapshot) => {
          setState((s) => fromSnapshot(snapshot, s.filter));
          setStatus("ready");
        },
        (err: unknown) => {
          setError(apiErrorMessage(err, "todo.loadFailed"));
          setStatus((current) => (current === "ready" ? current : "error"));
        },
      ),
    [transport],
  );

  useEffect(() => {
    stateRef.current = state;
    refreshRef.current = load;
  });

  useEffect(() => {
    if (!initial) void load();
  }, [initial, load]);

  const run = useCallback(async <T>(work: () => Promise<T>): Promise<T | null> => {
    try {
      return await work();
    } catch (err) {
      setError(apiErrorMessage(err, "todo.saveFailed"));
      await refreshRef.current();
      return null;
    }
  }, []);

  const actions = useMemo<TodoActions>(() => {
    const setTasks = (update: (tasks: TodoTask[]) => TodoTask[]) => setState((s) => ({ ...s, tasks: update(s.tasks) }));
    const findTask = (id: number) => stateRef.current.tasks.find((t) => t.id === id);

    return {
      refresh: load,
      clearError: () => setError(null),
      setFilter: (filter) => setState((s) => ({ ...s, filter: validFilter(filter, s) })),
      toggleFilter: (filter) => setState((s) => ({ ...s, filter: validFilter(toggleFilter(s.filter, filter), s) })),

      create: (input) =>
        run(async () => {
          const task = await transport.tasks.create(input);
          setTasks((tasks) => upsertTask(tasks, task));
          return task;
        }),
      update: (id, patch) =>
        run(async () => {
          setTasks((tasks) => patchTask(tasks, id, patch, now()));
          const task = await transport.tasks.update(id, patch);
          setTasks((tasks) => upsertTask(tasks, task));
          return task;
        }),
      move: async (id, move) => {
        setTasks((tasks) => moveTask(tasks, id, move));
        await run(() => transport.tasks.move(id, move));
      },
      complete: (id) =>
        run(async () => {
          const task = findTask(id);
          setState((s) => ({ ...s, tasks: removeTask(s.tasks, id), completedCount: s.completedCount + 1 }));
          const result = await transport.tasks.complete(id);
          setState((s) => ({ ...s, completedCount: result.completedCount }));
          return task ?? result.task;
        }),
      uncomplete: async (task) => {
        setState((s) => ({
          ...s,
          tasks: upsertTask(s.tasks, { ...task, completedAt: null }),
          completedCount: Math.max(0, s.completedCount - 1),
        }));
        await run(async () => {
          const result = await transport.tasks.uncomplete(task.id);
          setState((s) => ({ ...s, tasks: upsertTask(s.tasks, result.task), completedCount: result.completedCount }));
        });
      },
      remove: (id) =>
        run(async () => {
          const task = findTask(id);
          setTasks((tasks) => removeTask(tasks, id));
          await transport.tasks.remove(id);
          return task ?? null;
        }),
      undelete: async (task) => {
        setTasks((tasks) => upsertTask(tasks, task));
        await run(async () => {
          const restored = await transport.tasks.undelete(task.id);
          setTasks((tasks) => upsertTask(tasks, restored));
        });
      },
      restore: async (id) => {
        const restored = await run(async () => {
          const task = await transport.tasks.restore(id);
          setState((s) => ({
            ...s,
            tasks: upsertTask(s.tasks, task),
            completedCount: Math.max(0, s.completedCount - 1),
          }));
          return true;
        });
        return restored === true;
      },

      subtasks: {
        create: (taskId, title, afterId = null) =>
          run(async () => {
            const subtask = await transport.subtasks.create(taskId, { title, afterId });
            setTasks((tasks) => patchSubtasks(tasks, taskId, (subs) => [...subs, subtask]));
            return subtask;
          }),
        update: async (id, patch) => {
          const owner = taskOfSubtask(stateRef.current.tasks, id);
          if (owner) {
            setTasks((tasks) =>
              patchSubtasks(tasks, owner.id, (subs) => subs.map((s) => (s.id === id ? { ...s, ...patch } : s))),
            );
          }
          await run(() => transport.subtasks.update(id, patch));
        },
        move: async (id, move) => {
          await run(async () => {
            const moved = await transport.subtasks.move(id, move);
            setTasks((tasks) =>
              patchSubtasks(tasks, moved.taskId, (subs) => subs.map((s) => (s.id === id ? moved : s))),
            );
          });
        },
        remove: async (id) => {
          const owner = taskOfSubtask(stateRef.current.tasks, id);
          if (owner) setTasks((tasks) => patchSubtasks(tasks, owner.id, (subs) => subs.filter((s) => s.id !== id)));
          await run(() => transport.subtasks.remove(id));
        },
      },

      categories: {
        create: (input) =>
          run(async () => {
            const category = await transport.categories.create(input);
            setState((s) => ({ ...s, categories: sortByOrder([...s.categories, category]) }));
            return category;
          }),
        update: async (id, patch) => {
          setState((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
          await run(() => transport.categories.update(id, patch));
        },
        reorder: async (ids) => {
          setState((s) => ({ ...s, categories: reorderBy(s.categories, ids) }));
          await run(() => transport.categories.reorder(ids));
        },
        remove: async (id) => {
          setState((s) => removeCategoryLocally(s, id));
          await run(() => transport.categories.remove(id));
        },
      },

      projects: {
        create: (input) =>
          run(async () => {
            const project = await transport.projects.create(input);
            setState((s) => ({ ...s, projects: sortByOrder([...s.projects, project]) }));
            return project;
          }),
        update: async (id, name) => {
          setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) }));
          await run(() => transport.projects.update(id, { name }));
        },
        reorder: async (categoryId, ids) => {
          setState((s) => ({ ...s, projects: reorderBy(s.projects, ids) }));
          await run(() => transport.projects.reorder(categoryId, ids));
        },
        remove: async (id) => {
          setState((s) => removeProjectLocally(s, id));
          await run(() => transport.projects.remove(id));
        },
      },
    };
  }, [load, run, transport]);

  const visibleTasks = useMemo(() => filterTasks(state.tasks, state.filter), [state.tasks, state.filter]);

  return { ...state, status, error, offline, pending, visibleTasks, actions };
}

function sortByOrder<T extends { sortOrder: number; id: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

function reorderBy<T extends { id: number; sortOrder: number }>(items: T[], ids: number[]): T[] {
  const order = new Map(ids.map((id, index) => [id, index]));
  return sortByOrder(items.map((item) => (order.has(item.id) ? { ...item, sortOrder: order.get(item.id)! } : item)));
}

