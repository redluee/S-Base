"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { todoColorHex } from "@backend/shared/todo";
import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { CategoryTile } from "./category-icon";
import { CategoryCreator, CategoryEditor } from "./manage-category";
import { iconButtonClass } from "./manage-fields";
import { applyMove, nextFreeColor, openTaskCount } from "./manage-helpers";
import { projectsOf } from "./todo-state";
import { useTodoUi } from "./todo-ui";
import { useReorder } from "./use-reorder";

type View = { kind: "list" } | { kind: "edit"; id: number } | { kind: "new" };

const LIST: View = { kind: "list" };
const enter = "motion-safe:animate-[todo-fade-up_220ms_cubic-bezier(0.23,1,0.32,1)]";

function categorySummary(category: TodoCategory, open: number, projects: number): string {
  const parts = [t("todo.manage.openCount", { count: String(open) })];
  if (projects === 1) parts.push(t("todo.manage.projectCountOne"));
  else if (projects > 1) parts.push(t("todo.manage.projectCount", { count: String(projects) }));
  return category.isSystem ? [t("todo.manage.systemShort"), ...parts].join(" · ") : parts.join(" · ");
}

function CategoryList({ onOpen, onNew }: { onOpen: (id: number) => void; onNew: () => void }) {
  const { store } = useTodoUi();
  const ids = store.categories.map((c) => c.id);
  const reorder = useReorder(ids, (id, move) => {
    const next = applyMove(ids, id, move);
    if (next) void store.actions.categories.reorder(next);
  });

  return (
    <div className={cn("flex flex-col gap-3", enter)}>
      {store.categories.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-pretty text-muted-foreground">{t("todo.manage.empty")}</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-2xl bg-foreground/[0.03] ring-1 ring-foreground/[0.06]">
          {store.categories.map((category, index) => {
            const { dragging, ...props } = reorder.rowProps(category.id, index);
            const name = category.isSystem ? t("todo.manage.system") : category.name;
            const projects = projectsOf(store.projects, category.id).length;
            return (
              <li
                key={category.id}
                {...props}
                className={cn(
                  "relative select-none [-webkit-touch-callout:none]",
                  index > 0 && "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-foreground/[0.06]",
                  dragging && "z-10 rounded-2xl bg-[oklch(0.269_0_0)] ring-1 ring-foreground/10",
                  reorder.dragging && "cursor-grabbing",
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpen(category.id)}
                  aria-label={t("todo.manage.edit", { name })}
                  className="flex min-h-16 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <CategoryTile icon={category.icon} color={todoColorHex(category.color)} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] text-foreground">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {categorySummary(category, openTaskCount(store.tasks, category.id), projects)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onNew}
        className="group flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left text-[15px] text-muted-foreground border border-dashed border-foreground/15 transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-foreground/[0.06] transition-colors group-hover:bg-brand/15 group-hover:text-brand">
          <Plus className="size-[18px]" aria-hidden="true" />
        </span>
        {t("todo.manage.newCategory")}
      </button>
      {store.categories.length > 1 && (
        <p className="px-1 text-center text-xs text-muted-foreground/80">{t("todo.manage.reorderHint")}</p>
      )}
    </div>
  );
}

export function ManageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useTodoUi();
  const { confirm, dialog } = useConfirm();
  const [view, setView] = useState<View>(LIST);
  const [wasOpen, setWasOpen] = useState(open);
  const { categories: categoryActions, projects: projectActions } = store.actions;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(LIST);
  }

  const editing = view.kind === "edit" ? store.categories.find((c) => c.id === view.id) : undefined;
  const current: View = view.kind === "edit" && !editing ? LIST : view;

  const deleteCategory = async (category: TodoCategory) => {
    const count = openTaskCount(store.tasks, category.id);
    const description =
      count > 0
        ? t("todo.manage.deleteCategoryConfirm", { name: category.name, count: String(count) })
        : t("todo.manage.deleteCategoryConfirmEmpty", { name: category.name });
    if (!(await confirm(t("todo.manage.deleteCategory"), { description }))) return;
    setView(LIST);
    await categoryActions.remove(category.id);
  };

  const deleteProject = async (project: TodoProject) => {
    const description = t("todo.manage.deleteProjectConfirm", { name: project.name });
    if (await confirm(t("todo.manage.deleteProject"), { description })) await projectActions.remove(project.id);
  };

  const title =
    current.kind === "list"
      ? t("todo.manage.title")
      : current.kind === "new"
        ? t("todo.manage.newCategory")
        : editing?.isSystem
          ? t("todo.manage.system")
          : (editing?.name ?? "");

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        label={t("todo.manage.title")}
        header={
          <div className="flex items-center gap-1 px-2 pb-1">
            {current.kind === "list" ? (
              <span className="size-11 shrink-0" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => setView(LIST)}
                aria-label={t("todo.manage.back")}
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <h2 className="min-w-0 flex-1 truncate text-center text-base font-medium text-foreground">{title}</h2>
            <button type="button" className={iconButtonClass} onClick={onClose} aria-label={t("todo.manage.close")}>
              <X className="size-5" />
            </button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">
          {current.kind === "list" && (
            <CategoryList onOpen={(id) => setView({ kind: "edit", id })} onNew={() => setView({ kind: "new" })} />
          )}
          {current.kind === "new" && (
            <div key="new" className={enter}>
              <CategoryCreator
                initialColor={nextFreeColor(store.categories)}
                onCreated={(id) => setView({ kind: "edit", id })}
              />
            </div>
          )}
          {current.kind === "edit" && editing && (
            <div key={editing.id} className={enter}>
              <CategoryEditor
                category={editing}
                projects={projectsOf(store.projects, editing.id)}
                onDelete={() => void deleteCategory(editing)}
                onDeleteProject={(project) => void deleteProject(project)}
              />
            </div>
          )}
        </div>
      </BottomSheet>
      {dialog}
    </>
  );
}
