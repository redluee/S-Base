import type { TodoTransport } from "./todo-transport";

type OnlineOnly = <T>(ids: number[], send: () => Promise<T>) => Promise<T>;

export function onlineOnlyTransport(
  api: TodoTransport,
  onlineOnly: OnlineOnly,
): Pick<TodoTransport, "subtasks" | "categories" | "projects"> {
  return {
    subtasks: {
      create: (taskId, input) => onlineOnly([taskId], () => api.subtasks.create(taskId, input)),
      update: (id, patch) => onlineOnly([], () => api.subtasks.update(id, patch)),
      move: (id, move) => onlineOnly([], () => api.subtasks.move(id, move)),
      remove: (id) => onlineOnly([], () => api.subtasks.remove(id)),
    },
    categories: {
      create: (input) => onlineOnly([], () => api.categories.create(input)),
      update: (id, patch) => onlineOnly([], () => api.categories.update(id, patch)),
      reorder: (ids) => onlineOnly([], () => api.categories.reorder(ids)),
      remove: (id) => onlineOnly([], () => api.categories.remove(id)),
    },
    projects: {
      create: (input) => onlineOnly([input.categoryId], () => api.projects.create(input)),
      update: (id, patch) => onlineOnly([], () => api.projects.update(id, patch)),
      reorder: (categoryId, ids) => onlineOnly([], () => api.projects.reorder(categoryId, ids)),
      remove: (id) => onlineOnly([], () => api.projects.remove(id)),
    },
  };
}
