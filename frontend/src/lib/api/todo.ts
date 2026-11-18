import { request as clientRequest, type Fetcher } from "./core";
import type {
  TodoCategory,
  TodoCategoryInput,
  TodoCategoryPatch,
  TodoCategoryRemoval,
  TodoCompletionResult,
  TodoHistoryPage,
  TodoHistoryQuery,
  TodoMove,
  TodoProject,
  TodoPulsePoint,
  TodoPulseQuery,
  TodoSnapshot,
  TodoSubtask,
  TodoTask,
  TodoTaskInput,
  TodoTaskPatch,
} from "@backend/types/todo";

type Success = { success: true };

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function queryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const createTodoApi = (request: Fetcher) => ({
  snapshot: () => request<TodoSnapshot>("/todo"),
  count: () => request<{ open: number }>("/todo/count"),
  tasks: {
    get: (id: number) => request<TodoTask>(`/todo/tasks/${id}`),
    create: (input: TodoTaskInput) => request<TodoTask>("/todo/tasks", json("POST", input)),
    update: (id: number, patch: TodoTaskPatch) => request<TodoTask>(`/todo/tasks/${id}`, json("PATCH", patch)),
    move: (id: number, move: TodoMove) => request<TodoTask>(`/todo/tasks/${id}/move`, json("POST", move)),
    complete: (id: number) => request<TodoCompletionResult>(`/todo/tasks/${id}/complete`, json("POST")),
    uncomplete: (id: number) => request<TodoCompletionResult>(`/todo/tasks/${id}/uncomplete`, json("POST")),
    remove: (id: number) => request<Success>(`/todo/tasks/${id}`, json("DELETE")),
    undelete: (id: number) => request<TodoTask>(`/todo/tasks/${id}/undelete`, json("POST")),
    restore: (id: number) => request<TodoTask>(`/todo/tasks/${id}/restore`, json("POST")),
  },
  subtasks: {
    create: (taskId: number, input: { title: string; afterId?: number | null }) =>
      request<TodoSubtask>(`/todo/tasks/${taskId}/subtasks`, json("POST", input)),
    update: (id: number, patch: { title?: string; done?: boolean }) =>
      request<TodoSubtask>(`/todo/subtasks/${id}`, json("PATCH", patch)),
    move: (id: number, move: TodoMove) => request<TodoSubtask>(`/todo/subtasks/${id}/move`, json("POST", move)),
    remove: (id: number) => request<Success>(`/todo/subtasks/${id}`, json("DELETE")),
  },
  categories: {
    create: (input: TodoCategoryInput) =>
      request<TodoCategory>("/todo/categories", json("POST", input)),
    update: (id: number, patch: TodoCategoryPatch) =>
      request<TodoCategory>(`/todo/categories/${id}`, json("PATCH", patch)),
    reorder: (ids: number[]) => request<TodoCategory[]>("/todo/categories/reorder", json("POST", { ids })),
    remove: (id: number) => request<TodoCategoryRemoval>(`/todo/categories/${id}`, json("DELETE")),
  },
  projects: {
    create: (input: { categoryId: number; name: string }) =>
      request<TodoProject>("/todo/projects", json("POST", input)),
    update: (id: number, patch: { name: string }) =>
      request<TodoProject>(`/todo/projects/${id}`, json("PATCH", patch)),
    reorder: (categoryId: number, ids: number[]) =>
      request<TodoProject[]>(`/todo/categories/${categoryId}/projects/reorder`, json("POST", { ids })),
    remove: (id: number) => request<Success>(`/todo/projects/${id}`, json("DELETE")),
  },
  history: {
    list: (query: TodoHistoryQuery = {}) => request<TodoHistoryPage>(`/todo/history${queryString(query)}`),
    pulse: (query: TodoPulseQuery = {}) => request<TodoPulsePoint[]>(`/todo/history/pulse${queryString(query)}`),
  },
});

export type TodoApi = ReturnType<typeof createTodoApi>;

export const todoApi = createTodoApi(clientRequest);
