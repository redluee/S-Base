"use client";

import { todoColorHex } from "@backend/shared/todo";
import type { TodoHistoryTask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { formatCompletedDate } from "./history-helpers";
import { LightMarkdown } from "./light-markdown";

export function HistoryDetails({ item, onClose }: { item: TodoHistoryTask; onClose: () => void }) {
  const color = todoColorHex(item.categoryColor);
  return (
    <div className="mt-1 mb-3 ml-9 flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">{t("todo.history.completedOn", { date: formatCompletedDate(item.completedAt) })}</p>
      {item.categoryName ? (
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
          {item.categoryName}
        </p>
      ) : null}
      {item.subtasks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {item.subtasks.map((sub) => (
            <li key={sub.id} className={sub.done ? "text-muted-foreground line-through" : ""}>
              {sub.done ? "✓ " : "○ "}
              {sub.title}
            </li>
          ))}
        </ul>
      ) : null}
      {item.notes ? (
        <div className="break-words text-muted-foreground">
          <LightMarkdown source={item.notes} />
        </div>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="self-start min-h-11 pr-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {t("todo.history.close")}
      </button>
    </div>
  );
}
