"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { QUICK_DATES, type QuickDate } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { activeQuickDates, customDateLabel, isCustomDate, toggleQuickDate } from "./chip-state";
import { Chip, ChipRow, chipClass } from "./chip";

export interface DateChipsProps {
  value: string | null;
  onChange: (date: string | null) => void;
  disabled?: boolean;
}

const LABELS: Record<QuickDate, string> = {
  today: "todo.date.today",
  tomorrow: "todo.date.tomorrow",
  weekend: "todo.date.weekend",
  nextWeek: "todo.date.nextWeek",
};

export function DateChips({ value, onChange, disabled = false }: DateChipsProps) {
  const picker = useRef<HTMLInputElement>(null);
  const active = activeQuickDates(value);
  const custom = isCustomDate(value) && value !== null;

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
    <ChipRow label={t("todo.block.date")}>
      {QUICK_DATES.map((kind) => (
        <Chip
          key={kind}
          active={active.includes(kind)}
          disabled={disabled}
          onClick={() => onChange(toggleQuickDate(value, kind))}
        >
          {t(LABELS[kind])}
        </Chip>
      ))}
      {custom ? (
        <Chip active disabled={disabled} onClick={() => onChange(null)}>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {customDateLabel(value)}
        </Chip>
      ) : (
        <label className={chipClass(false)} aria-disabled={disabled || undefined}>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <span>{t("todo.date.pick")}</span>
          <input
            ref={picker}
            type="date"
            disabled={disabled}
            aria-label={t("todo.date.pick")}
            onClick={openPicker}
            onChange={(e) => onChange(e.target.value || null)}
            className="absolute inset-0 size-full cursor-pointer appearance-none rounded-lg opacity-0 disabled:cursor-default"
          />
        </label>
      )}
    </ChipRow>
  );
}
