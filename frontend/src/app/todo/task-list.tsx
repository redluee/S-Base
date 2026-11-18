"use client";

import { useTodoUi } from "./todo-ui";
import { TaskRow } from "./task-row";
import { CompletionRow } from "./completion/completion-row";

export function TaskList() {
  const { store } = useTodoUi();
  return (
    <ul className="flex flex-col">
      {store.visibleTasks.map((task) => (
        <li key={task.id}>
          <CompletionRow task={task}>
            <TaskRow task={task} />
          </CompletionRow>
        </li>
      ))}
    </ul>
  );
}
