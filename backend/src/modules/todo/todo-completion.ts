import type { TodoCompletionResult, TodoTask } from "../../types/todo";
import type { TodoLinks } from "./todo-links";
import type { TodoTasks } from "./todo-tasks";
import { notImplemented } from "./todo-stub";

export class TodoCompletion {
  constructor(
    readonly tasks: TodoTasks,
    readonly links: TodoLinks,
  ) {}

  completedCount(_userId: number): number {
    return notImplemented();
  }

  complete(_userId: number, _id: number): TodoCompletionResult {
    return notImplemented();
  }

  uncomplete(_userId: number, _id: number): TodoCompletionResult {
    return notImplemented();
  }

  remove(_userId: number, _id: number): { success: true } {
    return notImplemented();
  }

  undelete(_userId: number, _id: number): TodoTask {
    return notImplemented();
  }
}
