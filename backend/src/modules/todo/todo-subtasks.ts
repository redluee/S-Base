import type { TodoMove, TodoSubtask } from "../../types/todo";
import { notImplemented } from "./todo-stub";

export class TodoSubtasks {
  create(_userId: number, _taskId: number, _input: { title: string; afterId?: number | null }): TodoSubtask {
    return notImplemented();
  }

  update(_userId: number, _id: number, _patch: { title?: string; done?: boolean }): TodoSubtask {
    return notImplemented();
  }

  move(_userId: number, _id: number, _move: TodoMove): TodoSubtask {
    return notImplemented();
  }

  remove(_userId: number, _id: number): { success: true } {
    return notImplemented();
  }
}
