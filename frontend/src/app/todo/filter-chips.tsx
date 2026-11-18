"use client";

import { CornerDownRight, Flag } from "lucide-react";
import { todoColorHex } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { CategoryIcon } from "./category-icon";
import { Chip, ChipCount, ChipRow } from "./chip";
import { manualCategories, projectsOf } from "./todo-state";
import { useTodoUi } from "./todo-ui";

export function FilterChips() {
  const { store } = useTodoUi();
  const { filter, categories, projects, tasks, actions } = store;
  const system = categories.find((c) => c.isSystem);
  const showSystem = system !== undefined && tasks.some((task) => task.categoryId === system.id);
  const chips = [...manualCategories(categories), ...(showSystem && system ? [system] : [])];
  const activeCategory = filter.kind === "category" ? filter.categoryId : null;
  const activeProjects = projectsOf(projects, activeCategory);
  const categoryCounts = new Map<number, number>();
  const projectCounts = new Map<number, number>();
  for (const task of tasks) {
    if (task.categoryId !== null) categoryCounts.set(task.categoryId, (categoryCounts.get(task.categoryId) ?? 0) + 1);
    if (task.projectId !== null) projectCounts.set(task.projectId, (projectCounts.get(task.projectId) ?? 0) + 1);
  }
  const flaggedCount = tasks.filter((task) => task.flagged).length;

  return (
    <div className="mt-3 flex flex-col">
      <ChipRow label={t("todo.filter.label")}>
        <Chip active={filter.kind === "flagged"} onClick={() => actions.toggleFilter({ kind: "flagged" })}>
          <Flag className="size-3.5 text-brand" aria-hidden="true" />
          {t("todo.filter.flagged")}
          <ChipCount value={flaggedCount} active={filter.kind === "flagged"} />
        </Chip>
        {chips.map((category) => {
          const active = activeCategory === category.id;
          return (
            <Chip
              key={category.id}
              active={active}
              onClick={() => actions.toggleFilter({ kind: "category", categoryId: category.id, projectId: null })}
            >
              <CategoryIcon icon={category.icon} color={todoColorHex(category.color)} />
              {category.name}
              <ChipCount value={categoryCounts.get(category.id) ?? 0} active={active} />
            </Chip>
          );
        })}
      </ChipRow>
      {activeProjects.length > 0 && filter.kind === "category" && (
        <ChipRow label={t("todo.filter.projects")} className="-mt-1 pt-0">
          <CornerDownRight className="mx-1 size-3.5 shrink-0 self-center text-muted-foreground/60" aria-hidden="true" />
          {activeProjects.map((project) => {
            const active = filter.projectId === project.id;
            return (
              <Chip
                key={project.id}
                active={active}
                onClick={() =>
                  actions.toggleFilter({ kind: "category", categoryId: filter.categoryId, projectId: project.id })
                }
              >
                {project.name}
                <ChipCount value={projectCounts.get(project.id) ?? 0} active={active} />
              </Chip>
            );
          })}
        </ChipRow>
      )}
    </div>
  );
}
