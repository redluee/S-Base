"use client";

import { Check } from "lucide-react";
import { TODO_COLORS, TODO_PALETTE, type TodoColor } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";

interface PalettePickerProps {
  value: TodoColor;
  onChange: (color: TodoColor) => void;
  label: string;
}

export function PalettePicker({ value, onChange, label }: PalettePickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1 sm:grid-cols-10">
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
            className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-card",
                selected && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: TODO_PALETTE[color] }}
            >
              {selected && <Check className="size-4 text-zinc-950" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
