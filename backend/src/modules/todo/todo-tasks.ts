import type { TodoMove, TodoSnapshot, TodoTask, TodoTaskInput, TodoTaskPatch } from "../../types/todo";
import type { TodoCategories } from "./todo-categories";
import type { TodoLinks } from "./todo-links";
import { notImplemented } from "./todo-stub";
import type { TodoSubtasks } from "./todo-subtasks";

export class TodoTasks {
  constructor(
    readonly categories: TodoCategories,
    readonly links: TodoLinks,
    readonly subtasks: TodoSubtasks,
  ) {}

  snapshot(_userId: number): TodoSnapshot {
    return notImplemented();
  }

  openCount(_userId: number): number {
    return notImplemented();
  }

  get(_userId: number, _id: number): TodoTask {
    return notImplemented();
  }

  create(_userId: number, _input: TodoTaskInput): TodoTask {
    return notImplemented();
  }

  update(_userId: number, _id: number, _patch: TodoTaskPatch): TodoTask {
    return notImplemented();
  }

  move(_userId: number, _id: number, _move: TodoMove): TodoTask {
    return notImplemented();
  }
}
