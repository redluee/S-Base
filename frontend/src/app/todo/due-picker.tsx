"use client";

import { useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { dueBadge } from "./due-label";

interface DuePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  emptyLabel?: string;
  disabled?: boolean;
}

export function DuePicker({ value, onChange, emptyLabel, disabled = false }: DuePickerProps) {
  const picker = useRef<HTMLInputElement>(null);
  const badge = dueBadge(value);
  const label = badge?.label ?? emptyLabel;

  const openPicker = () => {
    const input = picker.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <div className="flex shrink-0 items-center">
      <label
        className={cn(
          "relative flex h-11 items-center gap-1.5 rounded-full text-sm transition-[background-color,color,padding] duration-150 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-brand",
          badge && "bg-brand/12 pl-3 text-foreground",
          badge && !disabled && "pr-1",
          badge && disabled && "pr-3",
          !badge && emptyLabel && "bg-foreground/[0.06] px-3 text-muted-foreground hover:text-foreground",
          !badge && !emptyLabel && "w-11 justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
          disabled && "pointer-events-none",
          badge?.tone === "overdue" && "bg-red-400/12 text-red-300",
        )}
      >
        <CalendarDays className={cn("size-[18px] shrink-0", badge && badge.tone !== "overdue" && "text-brand")} aria-hidden="true" />
        {label && <span className="whitespace-nowrap">{label}</span>}
        {!disabled && (
          <input
          ref={picker}
          type="date"
          value={value ?? ""}
          aria-label={t("todo.date.pick")}
          onClick={openPicker}
          onChange={(e) => onChange(e.target.value || null)}
          className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
          />
        )}
        {badge && !disabled && (
          <button
            type="button"
            aria-label={t("todo.date.clearLabel")}
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            className="relative z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </label>
    </div>
  );
}
