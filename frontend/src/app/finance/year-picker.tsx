"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/lang";

export function YearPicker({ value, maxYear, onChange }: {
  value: number;
  maxYear: number;
  onChange: (year: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(year) => {
      if (year !== null) onChange(Number(year));
    }}>
      <SelectTrigger aria-label={t("finance.year")} className="min-h-11 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72 bg-popover text-popover-foreground shadow-none motion-reduce:animate-none">
        {Array.from({ length: maxYear - 1899 }, (_, index) => maxYear - index).map((year) => (
          <SelectItem
            key={year}
            value={String(year)}
            className="min-h-11 tabular-nums data-[selected]:border-0 data-[selected]:bg-accent data-[selected]:font-medium data-[checked]:border-0 data-[checked]:bg-accent data-[checked]:font-medium data-[highlighted]:data-[selected]:bg-accent"
          >{year}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
