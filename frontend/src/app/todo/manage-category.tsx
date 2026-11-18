"use client";

import { useState } from "react";
import { todoColorHex, type TodoColor } from "@backend/shared/todo";
import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { AddField, NameField, RowActions, SectionLabel } from "./manage-fields";
import { moveId } from "./manage-helpers";
import { PalettePicker } from "./palette-picker";
import { useTodoUi } from "./todo-ui";

interface CategorySectionProps {
  category: TodoCategory;
  projects: TodoProject[];
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onDelete: () => void;
  onDeleteProject: (project: TodoProject) => void;
}

export function CategorySection({ category, projects, onUp, onDown, onDelete, onDeleteProject }: CategorySectionProps) {
  const { store } = useTodoUi();
  const { categories: categoryActions, projects: projectActions } = store.actions;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const system = category.isSystem;
  const name = system ? t("todo.manage.system") : category.name;
  const projectIds = projects.map((p) => p.id);
  const reorderProject = (id: number, delta: -1 | 1) => {
    const ids = moveId(projectIds, id, delta);
    return ids ? () => void projectActions.reorder(category.id, ids) : null;
  };
  const setColor = (color: TodoColor) => {
    setPaletteOpen(false);
    if (color !== category.color) void categoryActions.update(category.id, { color });
  };

  return (
    <section aria-label={name} className="flex flex-col gap-1 py-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={paletteOpen}
          aria-label={`${t("todo.manage.color")}: ${name}`}
          onClick={() => setPaletteOpen((v) => !v)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span
            className={cn("size-6 rounded-full", paletteOpen && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}
            style={{ backgroundColor: todoColorHex(category.color) }}
          />
        </button>
        {system ? (
          <span className="min-h-11 flex-1 content-center px-2 text-sm text-foreground">{name}</span>
        ) : (
          <NameField
            value={category.name}
            label={t("todo.manage.categoryName")}
            onCommit={(next) => void categoryActions.update(category.id, { name: next })}
          />
        )}
        <RowActions
          label={name}
          onUp={onUp}
          onDown={onDown}
          onDelete={system ? undefined : onDelete}
          deleteLabel={t("todo.manage.deleteCategory")}
        />
      </div>

      {paletteOpen && (
        <div className="pl-11">
          <PalettePicker value={category.color} onChange={setColor} label={`${t("todo.manage.color")}: ${name}`} />
        </div>
      )}

      <div className="flex flex-col pl-11">
        {(projects.length > 0 || !system) && <SectionLabel>{t("todo.manage.projects")}</SectionLabel>}
        <ul className="flex flex-col">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center gap-1">
              {project.source ? (
                <span className="min-h-11 flex-1 content-center px-2 text-sm text-muted-foreground">{project.name}</span>
              ) : (
                <NameField
                  value={project.name}
                  label={t("todo.manage.projectName")}
                  onCommit={(next) => void projectActions.update(project.id, next)}
                />
              )}
              <RowActions
                label={project.name}
                onUp={reorderProject(project.id, -1)}
                onDown={reorderProject(project.id, 1)}
                onDelete={project.source ? undefined : () => onDeleteProject(project)}
                deleteLabel={t("todo.manage.deleteProject")}
              />
            </li>
          ))}
        </ul>
        {system ? (
          <p className="px-2 pt-2 text-xs leading-relaxed text-muted-foreground">{t("todo.manage.systemHelp")}</p>
        ) : (
          <AddField
            label={t("todo.manage.addProject")}
            onAdd={(projectName) => projectActions.create({ categoryId: category.id, name: projectName })}
          />
        )}
      </div>
    </section>
  );
}
