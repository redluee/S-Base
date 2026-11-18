"use client";

import { Flag } from "lucide-react";
import { t } from "@/lib/lang";
import { CategoryStrip } from "./category-strip";
import { Chip, ChipCount } from "./chip";
import { manualCategories } from "./todo-state";
import { useTodoUi } from "./todo-ui";

function countBy(values: (number | null)[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function FilterChips() {
  const { store } = useTodoUi();
  const { filter, categories, projects, tasks, actions } = store;
  const system = categories.find((c) => c.isSystem);
  const showSystem = system !== undefined && tasks.some((task) => task.categoryId === system.id);
  const chips = [...manualCategories(categories), ...(showSystem && system ? [system] : [])];
  const categoryCounts = countBy(tasks.map((task) => task.categoryId));
  const projectCounts = countBy(tasks.map((task) => task.projectId));
  const flagged = filter.kind === "flagged";

  return (
    <CategoryStrip
      label={t("todo.filter.label")}
      className="mt-1"
      categories={chips}
      projects={projects}
      categoryId={filter.kind === "category" ? filter.categoryId : null}
      projectId={filter.kind === "category" ? filter.projectId : null}
      onCategory={(category) => actions.toggleFilter({ kind: "category", categoryId: category.id, projectId: null })}
      onProject={(project) =>
        actions.toggleFilter({ kind: "category", categoryId: project.categoryId, projectId: project.id })
      }
      categoryCount={(id) => categoryCounts.get(id) ?? 0}
      projectCount={(id) => projectCounts.get(id) ?? 0}
      leading={
        <Chip active={flagged} onClick={() => actions.toggleFilter({ kind: "flagged" })}>
          <Flag className="size-3.5 text-brand" aria-hidden="true" />
          {t("todo.filter.flagged")}
          <ChipCount value={tasks.filter((task) => task.flagged).length} active={flagged} />
        </Chip>
      }
    />
  );
}
