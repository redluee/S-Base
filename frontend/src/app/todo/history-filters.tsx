"use client";

import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { CategoryStrip } from "./category-strip";
import type { HistoryParams } from "./use-history";

interface HistoryFiltersProps {
  categories: TodoCategory[];
  projects: TodoProject[];
  value: HistoryParams;
  onChange: (patch: Partial<HistoryParams>) => void;
}

export function HistoryFilters({ categories, projects, value, onChange }: HistoryFiltersProps) {
  return (
    <CategoryStrip
      label={t("todo.filter.label")}
      className="mx-0 px-0"
      categories={categories}
      projects={projects}
      categoryId={value.categoryId}
      projectId={value.projectId}
      onCategory={(category) =>
        onChange({ categoryId: value.categoryId === category.id ? null : category.id, projectId: null })
      }
      onProject={(project) => onChange({ projectId: value.projectId === project.id ? null : project.id })}
    />
  );
}
