"use client";

import { useId, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarRange } from "lucide-react";
import { t } from "@/lib/lang";
import { Action } from "./ui";
import { compactRangeLabel, financeRangePresets, matchingPreset, presetRange, rangeError, rangeLabel, type FinanceRange } from "./lib/finance-range";

const dateInput = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm tabular-nums text-foreground [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-brand";

export function RangePicker({ value, today, open, onOpenChange, onChange }: {
  value: FinanceRange;
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (range: FinanceRange) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setTouched(false);
    }
  }
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const error = rangeError(draft, today);
  const active = matchingPreset(draft, today);
  function apply(range: FinanceRange) {
    onChange(range);
    onOpenChange(false);
  }
  return (
    <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger aria-label={`${t("finance.custom")}: ${rangeLabel(value)}`} render={<Action variant="outline" className="w-full justify-between px-2 text-xs sm:px-2.5 sm:text-sm" />}>
          <span aria-hidden="true" className="truncate tabular-nums"><span className="sm:hidden">{compactRangeLabel(value, today)}</span><span className="hidden sm:inline">{rangeLabel(value)}</span></span>
          <CalendarRange className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={8} className="z-50">
            <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10 transition-[opacity,scale] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <Popover.Title className="sr-only">{t("finance.range.choose")}</Popover.Title>
              <div className="flex flex-wrap gap-1" role="group" aria-label={t("finance.period")}>
                {financeRangePresets.map((preset) => (
                  <Action key={preset} variant="ghost" aria-pressed={active === preset} className={`h-9 min-h-9 px-2.5 text-xs ${active === preset ? "bg-accent text-brand hover:text-brand" : "text-muted-foreground"}`} onClick={() => apply(presetRange(preset, today))}>
                    {t(`finance.range.preset.${preset}`)}
                  </Action>
                ))}
              </div>
              <form className="mt-3 border-t border-border pt-3" noValidate onSubmit={(event) => {
                event.preventDefault();
                setTouched(true);
                if (!error) apply(draft);
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <label htmlFor={fromId} className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
                    {t("finance.range.from")}
                    <input id={fromId} type="date" className={dateInput} min="1900-01-01" max={draft.end && draft.end < today ? draft.end : today} value={draft.start} aria-invalid={touched && !!error} aria-describedby={touched && error ? errorId : undefined} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
                  </label>
                  <label htmlFor={toId} className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
                    {t("finance.range.to")}
                    <input id={toId} type="date" className={dateInput} min={draft.start || "1900-01-01"} max={today} value={draft.end} aria-invalid={touched && !!error} aria-describedby={touched && error ? errorId : undefined} onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
                  </label>
                </div>
                {touched && error && <p id={errorId} role="alert" className="mt-2 text-xs text-destructive">{t(error)}</p>}
                <Action type="submit" className="mt-3 w-full">{t("finance.range.apply")}</Action>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
