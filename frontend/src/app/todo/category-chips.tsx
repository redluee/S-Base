"use client";

import { t } from "@/lib/lang";
import { CategoryStrip } from "./category-strip";
import { toggleCategory, toggleProject } from "./chip-state";
import { manualCategories } from "./todo-state";
import { useTodoUi } from "./todo-ui";

export interface CategorySelection {
  categoryId: number | null;
  projectId: number | null;
}

export interface CategoryChipsProps {
  value: CategorySelection;
  onChange: (value: CategorySelection) => void;
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const { store } = useTodoUi();
  return (
    <CategoryStrip
      label={t("todo.block.category")}
      categories={manualCategories(store.categories)}
      projects={store.projects}
      categoryId={value.categoryId}
      projectId={value.projectId}
      onCategory={(category) => onChange(toggleCategory(value, category.id))}
      onProject={(project) => onChange(toggleProject(value, project))}
    />
  );
}
