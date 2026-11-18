"use client";

import { t } from "@/lib/lang";
import { CompletionRow } from "./completion/completion-row";
import { dayCounter, taskColor } from "./due-label";
import { TaskBlob } from "./task-blob";
import { TaskRow } from "./task-row";
import { useTodoUi } from "./todo-ui";
import { useReorder } from "./use-reorder";

export function TaskList() {
  const { store } = useTodoUi();
  const { visibleTasks, tasks, recentCompleted, categories, actions } = store;
  const reorder = useReorder(
    visibleTasks.map((task) => task.id),
    (id, move) => void actions.move(id, move),
  );

  if (visibleTasks.length === 0) {
    return (
      <div className="mt-24 flex flex-col items-center gap-6 text-center">
        <p className="text-sm text-muted-foreground">{t("todo.empty")}</p>
        {tasks.length === 0 && recentCompleted.length > 0 && (
          <ul className="flex w-full flex-col opacity-40" aria-hidden="true">
            {recentCompleted.map((task, i) => (
              <li
                key={task.id}
                className="flex min-h-11 items-center gap-2 px-1 text-left"
                style={{ opacity: 1 - i * 0.25 }}
              >
                <span className="flex size-11 shrink-0 items-center justify-center">
                  <TaskBlob color={taskColor(task, categories)} filled />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground line-through">{task.title}</span>
                <span className="text-xs text-muted-foreground">{dayCounter(task.dueDate)?.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <ul className="mt-2 flex flex-col">
      {visibleTasks.map((task, index) => {
        const { dragging, ...props } = reorder.rowProps(task.id, index);
        return (
          <li
            key={task.id}
            {...props}
            className={`select-none rounded-xl [-webkit-touch-callout:none] ${dragging ? "bg-white/10" : ""} ${reorder.dragging ? "cursor-grabbing" : ""}`}
          >
            <CompletionRow task={task}>
              <TaskRow task={task} />
            </CompletionRow>
          </li>
        );
      })}
    </ul>
  );
}
