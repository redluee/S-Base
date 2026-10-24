"use client";

import { useId, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/lang";
import { Action } from "./ui";
import { YearPicker } from "./year-picker";

export function MonthPicker({ value, today, onChange }: {
  value: string;
  today: string;
  onChange: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const labelId = useId();
  const valueId = useId();
  const currentYear = Number(today.slice(0, 4));
  const selectedMonth = t(`finance.calendar.month.${Number(value.slice(5, 7))}`);

  return (
    <div className="w-full sm:w-56">
      <span id={labelId} className="sr-only">{t("finance.month")}</span>
      <Popover.Root open={open} onOpenChange={(nextOpen) => {
        if (nextOpen) setYear(Number(value.slice(0, 4)));
        setOpen(nextOpen);
      }}>
        <Popover.Trigger aria-labelledby={`${labelId} ${valueId}`} render={<Action variant="outline" className="w-full justify-between" />}>
          <span id={valueId}>{selectedMonth} {value.slice(0, 4)}</span>
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={8} className="z-50">
            <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10">
              <Popover.Title className="sr-only">{t("finance.calendar.chooseMonth")}</Popover.Title>
              <div className="mb-3 flex items-center gap-2">
                <Action variant="ghost" disabled={year <= 1900} aria-label={t("finance.calendar.previousYear")} onClick={() => setYear(year - 1)}>
                  <ChevronLeft aria-hidden="true" />
                </Action>
                <div className="min-w-0 flex-1">
                  <YearPicker value={year} maxYear={currentYear} onChange={setYear} />
                </div>
                <Action variant="ghost" disabled={year >= currentYear} aria-label={t("finance.calendar.nextYear")} onClick={() => setYear(year + 1)}>
                  <ChevronRight aria-hidden="true" />
                </Action>
              </div>
              <div className="grid grid-cols-3 gap-1" role="group" aria-label={t("finance.month")}>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = `${year}-${String(index + 1).padStart(2, "0")}`;
                  const selected = value === month;
                  return <Action
                    key={month}
                    variant="ghost"
                    aria-pressed={selected}
                    disabled={month > today.slice(0, 7)}
                    className={`h-12 min-w-0 px-1 text-xs ${selected ? "bg-accent text-brand hover:text-brand" : ""}`}
                    onClick={() => {
                      onChange(month);
                      setOpen(false);
                    }}
                  >{t(`finance.calendar.month.${index + 1}`)}</Action>;
                })}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
