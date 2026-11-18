"use client";

import { todoColorHex } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { manualCategories, projectsOf } from "./todo-state";
import { useTodoUi } from "./todo-ui";

const chip =
  "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm transition-[background-color,color,scale] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-brand";
const idle = "bg-foreground/[0.06] text-muted-foreground ring-1 ring-foreground/[0.06] hover:text-foreground";
const active = "bg-brand text-zinc-900";

export function FilterChips() {
  const { store } = useTodoUi();
  const { filter, categories, projects, tasks, actions } = store;
  const system = categories.find((c) => c.isSystem);
  const showSystem = system !== undefined && tasks.some((task) => task.categoryId === system.id);
  const chips = [...manualCategories(categories), ...(showSystem && system ? [system] : [])];
  const activeCategory = filter.kind === "category" ? filter.categoryId : null;
  const activeProjects = projectsOf(projects, activeCategory);
  const counts = new Map<number, number>();
  for (const task of tasks) {
    if (task.categoryId !== null) counts.set(task.categoryId, (counts.get(task.categoryId) ?? 0) + 1);
  }

  return (
    <div className="mt-3 flex flex-col">
      <div role="group" aria-label={t("todo.filter.label")} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <button
          type="button"
          aria-pressed={filter.kind === "flagged"}
          className={`${chip} ${filter.kind === "flagged" ? active : idle}`}
          onClick={() => actions.toggleFilter({ kind: "flagged" })}
        >
          {t("todo.filter.flagged")}
        </button>
        {chips.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={activeCategory === category.id}
            className={`${chip} ${activeCategory === category.id ? active : idle}`}
            onClick={() => actions.toggleFilter({ kind: "category", categoryId: category.id, projectId: null })}
          >
            <span
              aria-hidden="true"
              className="mr-2 size-2 shrink-0 rounded-full"
              style={{ backgroundColor: todoColorHex(category.color) }}
            />
            {category.name}
            {counts.get(category.id) ? (
              <span
                className={`ml-2 text-xs tabular-nums ${activeCategory === category.id ? "text-zinc-900/60" : "text-muted-foreground/70"}`}
              >
                {counts.get(category.id)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {activeProjects.length > 0 && filter.kind === "category" && (
        <div
          role="group"
          aria-label={t("todo.filter.projects")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          {activeProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              aria-pressed={filter.projectId === project.id}
              className={`${chip} ${filter.projectId === project.id ? active : idle}`}
              onClick={() =>
                actions.toggleFilter({ kind: "category", categoryId: filter.categoryId, projectId: project.id })
              }
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
