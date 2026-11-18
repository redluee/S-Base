"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const chipClass = (active: boolean) =>
  cn(
    "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap",
    "transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]",
    "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40",
    active
      ? "bg-foreground/[0.12] text-foreground ring-1 ring-foreground/15"
      : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground",
  );

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  active: boolean;
  children: ReactNode;
}

export function Chip({ active, className, children, ...rest }: ChipProps) {
  return (
    <button type="button" aria-pressed={active} className={cn(chipClass(active), className)} {...rest}>
      {children}
    </button>
  );
}

export function ChipCount({ value, active }: { value: number; active: boolean }) {
  if (value === 0) return null;
  return (
    <span className={cn("text-[11px] tabular-nums", active ? "text-foreground/60" : "text-muted-foreground/60")}>
      {value}
    </span>
  );
}
