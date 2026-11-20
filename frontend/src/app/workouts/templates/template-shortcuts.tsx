"use client";

import type { WorkoutTemplate } from "@backend/types/workout";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { WorkoutIcon } from "@/app/workouts/templates/workout-icon";
import { templateIcon } from "@/app/workouts/templates/template-meta";
import { useStartTemplate } from "@/app/workouts/templates/use-start-template";

const SHORTCUT_COUNT = 4;

export function TemplateShortcuts({ templates, className }: { templates: WorkoutTemplate[]; className?: string }) {
  const { start, startingId, error, dialog } = useStartTemplate();
  const shortcuts = templates.slice(0, SHORTCUT_COUNT);
  if (shortcuts.length === 0) return null;

  return (
    <section aria-labelledby="template-shortcuts-heading" className={cn("flex flex-col gap-3", className)}>
      <h2
        id="template-shortcuts-heading"
        className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
      >
        {t("Start a template")}
      </h2>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {shortcuts.map((tpl) => (
          <button
            key={tpl.templateId}
            type="button"
            onClick={() => start(tpl.templateId)}
            disabled={startingId !== null}
            aria-label={`${t("Start workout")}: ${tpl.name}`}
            className="flex flex-col items-center justify-start gap-2.5 rounded-[2rem] bg-card ring-1 ring-white/[0.06] px-1.5 pt-4 pb-3 min-h-[6.25rem] transition-colors hover:bg-white/[0.09] disabled:opacity-60 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {startingId === tpl.templateId ? (
              <span className="size-10 inline-flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-brand" />
              </span>
            ) : (
              <WorkoutIcon icon={templateIcon(tpl)} className="size-10" />
            )}
            <span className="line-clamp-2 text-center text-xs sm:text-sm leading-tight text-foreground">
              {tpl.name}
            </span>
          </button>
        ))}
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      {dialog}
    </section>
  );
}
