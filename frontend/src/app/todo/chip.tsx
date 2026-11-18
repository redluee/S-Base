"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const chipClass = (active: boolean) =>
  cn(
    "relative flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm whitespace-nowrap ring-1 transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40",
    active
      ? "bg-brand/15 text-foreground ring-brand"
      : "bg-foreground/5 text-muted-foreground ring-foreground/10 hover:text-foreground",
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

export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
      {children}
    </div>
  );
}

export function ColorDot({ color }: { color: string }) {
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}
