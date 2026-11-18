import type { TodoHistoryPage, TodoHistoryQuery, TodoPulsePoint, TodoPulseQuery, TodoTask } from "../../types/todo";
import type { TodoLinks } from "./todo-links";
import type { TodoSubtasks } from "./todo-subtasks";
import type { TodoTasks } from "./todo-tasks";
import { notImplemented } from "./todo-stub";

export class TodoHistory {
  constructor(
    readonly tasks: TodoTasks,
    readonly links: TodoLinks,
    readonly subtasks: TodoSubtasks,
  ) {}

  list(_userId: number, _query: TodoHistoryQuery): TodoHistoryPage {
    return notImplemented();
  }

  pulse(_userId: number, _query: TodoPulseQuery): TodoPulsePoint[] {
    return notImplemented();
  }

  restore(_userId: number, _id: number): TodoTask {
    return notImplemented();
  }
}
