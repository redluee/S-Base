"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Check, ChevronDown, ChevronUp, Loader2, Play } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkoutTemplate } from "@backend/types/workout";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { WorkoutIcon } from "@/app/workouts/templates/workout-icon";
import { splitMuscleGroups, templateIcon } from "@/app/workouts/templates/template-meta";
import { useStartTemplate } from "@/app/workouts/templates/use-start-template";

const iconButton =
  "size-11 shrink-0 inline-flex items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground hover:text-brand disabled:opacity-30 disabled:pointer-events-none transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function templateMeta(template: WorkoutTemplate) {
  const parts: string[] = [];
  if (template.estimatedTime) parts.push(`${template.estimatedTime} ${t("min")}`);
  const groups = splitMuscleGroups(template.targetMuscleGroups);
  if (groups.length > 0) parts.push(groups.join(" & "));
  else if (template.exerciseCount) {
    parts.push(`${template.exerciseCount} ${template.exerciseCount === 1 ? t("exercise") : t("exercises")}`);
  }
  return parts.join(" • ");
}

export function WorkoutTemplateList({
  templates: initialTemplates,
  actions,
}: {
  templates: WorkoutTemplate[];
  actions: ReactNode;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const { start, startingId, error, dialog } = useStartTemplate();

  async function saveOrder(next: WorkoutTemplate[]) {
    setSavingOrder(true);
    try {
      await api.workouts.templates.reorder(next.map((tpl) => tpl.templateId));
      router.refresh();
    } catch {
      setTemplates(initialTemplates);
    } finally {
      setSavingOrder(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= templates.length) return;
    const next = [...templates];
    [next[index], next[target]] = [next[target], next[index]];
    setTemplates(next);
    saveOrder(next);
  }

  return (
    <section aria-labelledby="workout-templates-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="workout-templates-heading" className="text-xl font-semibold text-foreground">
          {t("Templates")}
        </h2>
        <div className="flex items-center gap-1">
          {templates.length > 1 && (
            <button
              type="button"
              onClick={() => setReordering((v) => !v)}
              aria-pressed={reordering}
              aria-label={reordering ? t("Done") : t("Reorder")}
              title={reordering ? t("Done") : t("Reorder")}
              className={cn(
                iconButton,
                "size-12",
                reordering ? "bg-brand text-zinc-950 hover:text-zinc-950" : "hover:text-foreground"
              )}
            >
              {reordering ? <Check className="size-5" /> : <ArrowUpDown className="size-5" />}
            </button>
          )}
          {actions}
        </div>
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center rounded-[1.75rem] bg-card">
          <p className="text-sm text-muted-foreground">{t("No templates yet.")}</p>
          <Link
            href="/workouts/new"
            className="min-h-11 inline-flex items-center px-5 rounded-full bg-brand text-zinc-950 text-sm font-medium hover:bg-brand-hover transition-colors"
          >
            {t("Create your first template")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map((template, index) => {
            const starting = startingId === template.templateId;
            return (
              <li
                key={template.templateId}
                className="group relative flex items-center gap-3 rounded-[1.75rem] bg-card pl-3 pr-3 py-3 transition-colors hover:bg-white/[0.09]"
              >
                <WorkoutIcon icon={templateIcon(template)} className="size-11" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/workouts/t/${template.templateId}`}
                    className="block truncate text-base sm:text-lg font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-[1.75rem] focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    {template.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">{templateMeta(template)}</p>
                </div>
                {reordering ? (
                  <div className="relative z-10 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || savingOrder}
                      aria-label={t("Move Up")}
                      title={t("Move Up")}
                      className={iconButton}
                    >
                      <ChevronUp className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === templates.length - 1 || savingOrder}
                      aria-label={t("Move Down")}
                      title={t("Move Down")}
                      className={iconButton}
                    >
                      <ChevronDown className="size-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => start(template.templateId)}
                    disabled={startingId !== null}
                    aria-label={`${t("Start Workout")}: ${template.name}`}
                    title={t("Start Workout")}
                    className={cn(iconButton, "relative z-10 size-12 text-brand hover:bg-brand hover:text-zinc-950")}
                  >
                    {starting ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Play className="size-4 fill-current translate-x-px" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </section>
  );
}
