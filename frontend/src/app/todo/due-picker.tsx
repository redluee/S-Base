"use client";

import { useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { dueBadge } from "./due-label";

export function DuePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const badge = dueBadge(value);

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
          badge
            ? "bg-brand/12 pr-1 pl-3 text-foreground"
            : "w-11 justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
          badge?.tone === "overdue" && "bg-red-400/12",
        )}
      >
        <CalendarDays className={cn("size-[18px] shrink-0", badge && badge.tone !== "overdue" && "text-brand")} aria-hidden="true" />
        {badge && <span className="whitespace-nowrap">{badge.label}</span>}
        <input
          ref={picker}
          type="date"
          value={value ?? ""}
          aria-label={t("todo.date.pick")}
          onClick={openPicker}
          onChange={(e) => onChange(e.target.value || null)}
          className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
        />
        {badge && (
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
