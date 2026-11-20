"use client";

import { WORKOUT_ICONS, type WorkoutIcon } from "@backend/shared/workout";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { WORKOUT_ICON_COMPONENTS } from "@/app/workouts/templates/workout-icon";
import { guessWorkoutIcon } from "@/app/workouts/templates/template-meta";

export function WorkoutIconPicker({
  value,
  onChange,
  name,
  muscleGroups,
}: {
  value: WorkoutIcon | null;
  onChange: (icon: WorkoutIcon | null) => void;
  name: string;
  muscleGroups: string;
}) {
  const automatic = guessWorkoutIcon(name, muscleGroups);
  const AutoIcon = WORKOUT_ICON_COMPONENTS[automatic];

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium mb-2">{t("Icon")}</legend>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-[repeat(16,minmax(0,1fr))] gap-2">
        <button
          type="button"
          aria-pressed={value === null}
          aria-label={t("Automatic icon")}
          title={t("Automatic icon")}
          onClick={() => onChange(null)}
          className={cn(
            "relative aspect-square min-h-11 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === null ? "bg-brand text-zinc-950" : "bg-white/[0.06] text-muted-foreground hover:text-foreground"
          )}
        >
          <AutoIcon className="size-5" aria-hidden="true" />
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-zinc-800 px-1 text-[9px] font-semibold leading-4 text-foreground">
            A
          </span>
        </button>
        {WORKOUT_ICONS.map((icon) => {
          const Icon = WORKOUT_ICON_COMPONENTS[icon];
          const label = t(`workout.icon.${icon}`);
          return (
            <button
              key={icon}
              type="button"
              aria-pressed={value === icon}
              aria-label={label}
              title={label}
              onClick={() => onChange(icon)}
              className={cn(
                "aspect-square min-h-11 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                value === icon
                  ? "bg-brand text-zinc-950 shadow-[0_0_1rem_color-mix(in_oklab,var(--color-brand)_40%,transparent)]"
                  : "bg-white/[0.06] text-brand hover:bg-white/10"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
