"use client";

import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { todoColorHex } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { CategoryIcon } from "./category-icon";
import { Chip, ChipRow } from "./chip";
import type { HistoryParams } from "./use-history";

interface HistoryFiltersProps {
  categories: TodoCategory[];
  projects: TodoProject[];
  value: HistoryParams;
  onChange: (patch: Partial<HistoryParams>) => void;
}

export function HistoryFilters({ categories, projects, value, onChange }: HistoryFiltersProps) {
  const visibleProjects = value.categoryId === null ? [] : projects.filter((p) => p.categoryId === value.categoryId);
  return (
    <div className="flex flex-col">
      <ChipRow label={t("todo.filter.label")} className="mx-0 px-0">
        {categories.map((category) => {
          const active = value.categoryId === category.id;
          return (
            <Chip
              key={category.id}
              active={active}
              onClick={() => onChange({ categoryId: active ? null : category.id, projectId: null })}
            >
              <CategoryIcon icon={category.icon} color={todoColorHex(category.color)} />
              {category.name}
            </Chip>
          );
        })}
      </ChipRow>
      {visibleProjects.length > 0 ? (
        <ChipRow label={t("todo.filter.projects")} className="mx-0 -mt-1 px-0 pt-0">
          {visibleProjects.map((project) => {
            const active = value.projectId === project.id;
            return (
              <Chip key={project.id} active={active} onClick={() => onChange({ projectId: active ? null : project.id })}>
                {project.name}
              </Chip>
            );
          })}
        </ChipRow>
      ) : null}
    </div>
  );
}
