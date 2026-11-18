"use client";

import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { todoColorHex } from "@backend/shared/todo";
import type { HistoryParams } from "./use-history";

interface HistoryFiltersProps {
  categories: TodoCategory[];
  projects: TodoProject[];
  value: HistoryParams;
  onChange: (patch: Partial<HistoryParams>) => void;
}

function chipClass(active: boolean): string {
  return `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
    active ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
  }`;
}

export function HistoryFilters({ categories, projects, value, onChange }: HistoryFiltersProps) {
  const visibleProjects = value.categoryId === null ? [] : projects.filter((p) => p.categoryId === value.categoryId);
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((category) => {
          const active = value.categoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              className={chipClass(active)}
              onClick={() => onChange({ categoryId: active ? null : category.id, projectId: null })}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: todoColorHex(category.color) }}
              />
              {category.name}
            </button>
          );
        })}
      </div>
      {visibleProjects.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {visibleProjects.map((project) => {
            const active = value.projectId === project.id;
            return (
              <button
                key={project.id}
                type="button"
                aria-pressed={active}
                className={chipClass(active)}
                onClick={() => onChange({ projectId: active ? null : project.id })}
              >
                {project.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
