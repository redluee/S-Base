"use client";

import { X } from "lucide-react";
import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { t } from "@/lib/lang";
import { BottomSheet } from "./bottom-sheet";
import { CategorySection } from "./manage-category";
import { AddField, iconButtonClass } from "./manage-fields";
import { moveId, nextFreeColor, openTaskCount } from "./manage-helpers";
import { projectsOf } from "./todo-state";
import { useTodoUi } from "./todo-ui";

export function ManageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useTodoUi();
  const { confirm, dialog } = useConfirm();
  const { categories: categoryActions, projects: projectActions } = store.actions;
  const ids = store.categories.map((c) => c.id);

  const reorder = (id: number, delta: -1 | 1) => {
    const next = moveId(ids, id, delta);
    return next ? () => void categoryActions.reorder(next) : null;
  };

  const deleteCategory = async (category: TodoCategory) => {
    const count = openTaskCount(store.tasks, category.id);
    const description =
      count > 0
        ? t("todo.manage.deleteCategoryConfirm", { name: category.name, count: String(count) })
        : t("todo.manage.deleteCategoryConfirmEmpty", { name: category.name });
    if (await confirm(t("todo.manage.deleteCategory"), { description })) await categoryActions.remove(category.id);
  };

  const deleteProject = async (project: TodoProject) => {
    const description = t("todo.manage.deleteProjectConfirm", { name: project.name });
    if (await confirm(t("todo.manage.deleteProject"), { description })) await projectActions.remove(project.id);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        label={t("todo.manage.title")}
        header={
          <div className="flex items-center justify-between px-4 pb-1">
            <h2 className="text-base font-medium text-foreground">{t("todo.manage.title")}</h2>
            <button type="button" className={iconButtonClass} onClick={onClose} aria-label={t("todo.manage.close")}>
              <X className="size-5" />
            </button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
          <div className="flex flex-col divide-y divide-foreground/10">
            {store.categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                projects={projectsOf(store.projects, category.id)}
                onUp={reorder(category.id, -1)}
                onDown={reorder(category.id, 1)}
                onDelete={() => void deleteCategory(category)}
                onDeleteProject={(project) => void deleteProject(project)}
              />
            ))}
          </div>
          <div className="border-t border-foreground/10 py-3 pl-2">
            <AddField
              label={t("todo.manage.addCategory")}
              onAdd={(name) => categoryActions.create({ name, color: nextFreeColor(store.categories) })}
            />
          </div>
        </div>
      </BottomSheet>
      {dialog}
    </>
  );
}
