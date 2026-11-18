"use client";

import { Check } from "lucide-react";
import { TODO_COLORS, TODO_ICONS, TODO_PALETTE, type TodoColor, type TodoIcon } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

export function PalettePicker({ value, onChange }: { value: TodoColor; onChange: (color: TodoColor) => void }) {
  return (
    <div role="radiogroup" aria-label={t("todo.manage.color")} className="-mx-1.5 grid grid-cols-5 justify-items-center sm:grid-cols-10">
      {TODO_COLORS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(`todo.color.${color}`)}
            onClick={() => onChange(color)}
            className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-[scale,box-shadow] duration-150 ease-out group-active:scale-90",
                selected ? "ring-2 ring-foreground/80" : "group-hover:scale-110",
              )}
              style={{ backgroundColor: TODO_PALETTE[color] }}
            >
              {selected && <Check className="size-3.5 text-zinc-950" strokeWidth={3} aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface IconPickerProps {
  value: TodoIcon;
  color: string;
  onChange: (icon: TodoIcon) => void;
}

export function IconPicker({ value, color, onChange }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label={t("todo.manage.icon")} className="grid grid-cols-6 gap-1 sm:grid-cols-8">
      {TODO_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(`todo.icon.${icon}`)}
            title={t(`todo.icon.${icon}`)}
            onClick={() => onChange(icon)}
            className={cn(
              "flex aspect-square min-h-11 items-center justify-center rounded-xl transition-[background-color,color,scale] duration-150 ease-out active:scale-90 focus-visible:outline-2 focus-visible:outline-brand",
              selected ? "ring-1" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            )}
            style={
              selected
                ? {
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                    ["--tw-ring-color" as string]: `color-mix(in srgb, ${color} 45%, transparent)`,
                  }
                : undefined
            }
          >
            <CategoryIcon icon={icon} className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
