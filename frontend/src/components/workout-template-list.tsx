"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";

export function WorkoutTemplateList({ templates: initialTemplates, actions }: { templates: any[]; actions: ReactNode }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  async function saveOrder(next: any[]) {
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between mt-3 mb-1 gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("Templates")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {templates.length > 1 && (
            <button
              type="button"
              onClick={() => setReordering((v) => !v)}
              className="text-xs font-medium text-brand hover:text-brand-hover px-3 rounded-lg transition-colors min-h-11"
            >
              {reordering ? t("Done") : t("Reorder")}
            </button>
          )}
          {actions}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-card border border-white/5 p-6">
          <p className="text-sm text-muted-foreground mb-4">{t("No templates yet.")}</p>
          <Button
            render={<Link href="/workouts/new" />}
            className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm"
          >
            {t("Create your first template")}
          </Button>
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        {templates.map((template: any, index: number) => {
          const card = (
            <div className="px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-foreground text-sm sm:text-base truncate">
                    {template.name}
                  </h2>
                  {template.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] sm:text-xs">
                    {template.exerciseCount !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                        {template.exerciseCount} {template.exerciseCount === 1 ? t("exercise") : t("exercises")}
                      </span>
                    )}
                    {template.targetMuscleGroups && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                        {template.targetMuscleGroups}
                      </span>
                    )}
                    {template.estimatedTime && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                        {template.estimatedTime} {t("min")}
                      </span>
                    )}
                  </div>
                </div>
                {!reordering && (
                  <ChevronRight className="size-4 sm:size-5 text-muted-foreground shrink-0 self-end" strokeWidth={1.5} />
                )}
              </div>
            </div>
          );

          if (reordering) {
            return (
              <div
                key={template.templateId}
                className="flex items-stretch rounded-xl bg-card ring-1 ring-foreground/10"
              >
                <div className="flex-1 min-w-0">{card}</div>
                <div className="flex flex-col shrink-0 border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || savingOrder}
                    aria-label={t("Move Up")}
                    title={t("Move Up")}
                    className="flex-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-brand disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronUp className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === templates.length - 1 || savingOrder}
                    aria-label={t("Move Down")}
                    title={t("Move Down")}
                    className="flex-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-brand disabled:opacity-30 disabled:pointer-events-none transition-colors border-t border-white/10"
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={template.templateId}
              href={`/workouts/t/${template.templateId}`}
              className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
            >
              {card}
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}
