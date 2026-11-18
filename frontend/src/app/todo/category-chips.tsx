"use client";

import { todoColorHex } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { toggleCategory, toggleProject } from "./chip-state";
import { CategoryIcon } from "./category-icon";
import { Chip, ChipRow } from "./chip";
import { manualCategories, projectsOf } from "./todo-state";
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
  const categories = manualCategories(store.categories);
  const projects = projectsOf(store.projects, value.categoryId);
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <ChipRow label={t("todo.block.category")}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            active={value.categoryId === category.id}
            onClick={() => onChange(toggleCategory(value, category.id))}
          >
            <CategoryIcon icon={category.icon} color={todoColorHex(category.color)} />
            {category.name}
          </Chip>
        ))}
      </ChipRow>
      {projects.length > 0 && (
        <ChipRow label={t("todo.block.project")}>
          {projects.map((project) => (
            <Chip
              key={project.id}
              active={value.projectId === project.id}
              onClick={() => onChange(toggleProject(value, project))}
            >
              {project.name}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}
