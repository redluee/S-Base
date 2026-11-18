import type { TodoSource } from "../../shared/todo";

export interface LinkedTaskRef {
  userId: number;
  sourceModule: TodoSource;
  sourceId: number;
  sourcePreviousStatus: string | null;
}

export class TodoLinks {
  sync(_userId: number): void {}

  onComplete(_task: LinkedTaskRef): string | null {
    return null;
  }

  onRevert(_task: LinkedTaskRef): void {}

  hide(_task: LinkedTaskRef): void {}

  unhide(_task: LinkedTaskRef): void {}
}
