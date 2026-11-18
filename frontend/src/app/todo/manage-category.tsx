"use client";

import { useState } from "react";
import { GripVertical, Hash, Lock, Trash2, X } from "lucide-react";
import { DEFAULT_TODO_ICON, TODO_NAME_MAX, todoColorHex, type TodoColor, type TodoIcon } from "@backend/shared/todo";
import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { CategoryTile } from "./category-icon";
import { AddField, iconButtonClass, NameField, SectionLabel } from "./manage-fields";
import { applyMove, cleanName } from "./manage-helpers";
import { IconPicker, PalettePicker } from "./palette-picker";
import { useTodoUi } from "./todo-ui";
import { useReorder } from "./use-reorder";

const section = "flex flex-col";

interface ProjectListProps {
  category: TodoCategory;
  projects: TodoProject[];
  onDeleteProject: (project: TodoProject) => void;
}

function ProjectList({ category, projects, onDeleteProject }: ProjectListProps) {
  const { store } = useTodoUi();
  const actions = store.actions.projects;
  const ids = projects.map((p) => p.id);
  const reorder = useReorder(ids, (id, move) => {
    const next = applyMove(ids, id, move);
    if (next) void actions.reorder(category.id, next);
  });

  return (
    <section className={section} aria-label={t("todo.manage.projects")}>
      <SectionLabel>{t("todo.manage.projects")}</SectionLabel>
      {projects.length === 0 && !category.isSystem && (
        <p className="pb-2 text-sm text-pretty text-muted-foreground">{t("todo.manage.noProjects")}</p>
      )}
      {projects.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-xl bg-foreground/[0.03] ring-1 ring-foreground/[0.06]">
          {projects.map((project, index) => {
            const { dragging, onPointerDown, ...props } = reorder.rowProps(project.id, index);
            const locked = project.source !== null;
            return (
              <li
                key={project.id}
                {...props}
                className={cn(
                  "relative flex min-h-12 items-center pr-1 [-webkit-touch-callout:none]",
                  index > 0 && "before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-foreground/[0.06]",
                  dragging && "z-10 rounded-xl bg-[oklch(0.269_0_0)] ring-1 ring-foreground/10",
                )}
              >
                {locked ? (
                  <span className="flex size-11 shrink-0 items-center justify-center text-muted-foreground/60" aria-hidden="true">
                    <Hash className="size-4" />
                  </span>
                ) : (
                  <span
                    onPointerDown={onPointerDown}
                    title={t("todo.manage.reorder")}
                    className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 hover:text-foreground"
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </span>
                )}
                {locked ? (
                  <span className="min-h-11 flex-1 content-center px-2 text-sm text-muted-foreground">{project.name}</span>
                ) : (
                  <NameField
                    value={project.name}
                    label={t("todo.manage.projectName")}
                    onCommit={(next) => void actions.update(project.id, next)}
                  />
                )}
                {!locked && (
                  <button
                    type="button"
                    className={cn(iconButtonClass, "hover:text-destructive")}
                    onClick={() => onDeleteProject(project)}
                    aria-label={`${t("todo.manage.deleteProject")}: ${project.name}`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {category.isSystem ? (
        <p className="pt-3 text-xs leading-relaxed text-pretty text-muted-foreground">{t("todo.manage.systemHelp")}</p>
      ) : (
        <div className="pt-1">
          <AddField
            label={t("todo.manage.newProject")}
            onAdd={(name) => actions.create({ categoryId: category.id, name })}
          />
        </div>
      )}
    </section>
  );
}

interface AppearanceProps {
  color: TodoColor;
  icon: TodoIcon;
  onColor: (color: TodoColor) => void;
  onIcon: (icon: TodoIcon) => void;
}

function Appearance({ color, icon, onColor, onIcon }: AppearanceProps) {
  return (
    <>
      <section className={section} aria-label={t("todo.manage.color")}>
        <SectionLabel>{t("todo.manage.color")}</SectionLabel>
        <PalettePicker value={color} onChange={onColor} />
      </section>
      <section className={section} aria-label={t("todo.manage.icon")}>
        <SectionLabel>{t("todo.manage.icon")}</SectionLabel>
        <IconPicker value={icon} color={todoColorHex(color)} onChange={onIcon} />
      </section>
    </>
  );
}

interface EditorProps {
  category: TodoCategory;
  projects: TodoProject[];
  onDelete: () => void;
  onDeleteProject: (project: TodoProject) => void;
}

export function CategoryEditor({ category, projects, onDelete, onDeleteProject }: EditorProps) {
  const { store } = useTodoUi();
  const actions = store.actions.categories;
  const system = category.isSystem;
  const name = system ? t("todo.manage.system") : category.name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CategoryTile icon={category.icon} color={todoColorHex(category.color)} size="lg" />
        {system ? (
          <span className="flex min-h-11 flex-1 items-center gap-2 px-2 text-lg font-medium text-foreground">
            {name}
            <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </span>
        ) : (
          <NameField
            value={category.name}
            label={t("todo.manage.categoryName")}
            onCommit={(next) => void actions.update(category.id, { name: next })}
            className="bg-foreground/[0.06] px-3 text-lg font-medium"
          />
        )}
      </div>
      <Appearance
        color={category.color}
        icon={category.icon}
        onColor={(color) => color !== category.color && void actions.update(category.id, { color })}
        onIcon={(icon) => icon !== category.icon && void actions.update(category.id, { icon })}
      />
      <ProjectList category={category} projects={projects} onDeleteProject={onDeleteProject} />
      {!system && (
        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm text-destructive ring-1 ring-destructive/30 transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t("todo.manage.deleteCategory")}
        </button>
      )}
    </div>
  );
}

export function CategoryCreator({ initialColor, onCreated }: { initialColor: TodoColor; onCreated: (id: number) => void }) {
  const { store } = useTodoUi();
  const [name, setName] = useState("");
  const [color, setColor] = useState<TodoColor>(initialColor);
  const [icon, setIcon] = useState<TodoIcon>(DEFAULT_TODO_ICON);
  const [busy, setBusy] = useState(false);
  const valid = cleanName(name);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const created = await store.actions.categories.create({ name: valid, color, icon });
    setBusy(false);
    if (created) onCreated(created.id);
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-3">
        <CategoryTile icon={icon} color={todoColorHex(color)} size="lg" />
        <input
          value={name}
          autoFocus
          maxLength={TODO_NAME_MAX}
          aria-label={t("todo.manage.categoryName")}
          placeholder={t("todo.manage.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-foreground/[0.06] px-3 text-lg font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground/20"
        />
      </div>
      <Appearance color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
      <button
        type="submit"
        disabled={!valid || busy}
        className="flex min-h-11 items-center justify-center rounded-xl bg-brand text-sm font-medium text-zinc-950 transition-[opacity,scale] duration-150 active:scale-[0.98] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t("todo.manage.create")}
      </button>
    </form>
  );
}
