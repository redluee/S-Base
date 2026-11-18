"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TaskCheckProps {
  color: string;
  checked: boolean;
  animate?: boolean;
  size?: "md" | "sm";
}

export function TaskCheck({ color, checked, animate = true, size = "md" }: TaskCheckProps) {
  const [armed, setArmed] = useState(!checked);
  if (!checked && !armed) setArmed(true);
  const play = checked && animate && armed;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block shrink-0 transition-transform duration-150 ease-out group-active:scale-90",
        size === "md" ? "size-[22px]" : "size-[18px]",
      )}
    >
      {play && (
        <span
          className="absolute inset-0 rounded-full motion-safe:animate-[todo-check-ring_520ms_cubic-bezier(0.23,1,0.32,1)_forwards] motion-reduce:hidden"
          style={{ backgroundColor: color }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "relative block size-full overflow-visible",
          play && "motion-safe:animate-[todo-check-pop_260ms_cubic-bezier(0.23,1,0.32,1)]",
        )}
      >
        <circle
          cx="12"
          cy="12"
          r="10.5"
          strokeWidth="2"
          className={cn(
            "transition-[fill,fill-opacity,stroke-opacity] duration-150 ease-out",
            checked ? "[fill-opacity:1]" : "[fill-opacity:0] [@media(hover:hover)]:group-hover:[fill-opacity:0.14]",
          )}
          style={{ fill: color, stroke: color, strokeOpacity: checked ? 1 : 0.7 }}
        />
        <path
          d="M7.4 12.4l3.1 3.1 6.1-6.6"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          className={cn(
            "transition-[stroke-dashoffset,opacity] ease-out",
            checked
              ? "stroke-zinc-950 opacity-100 [stroke-dashoffset:0] delay-75 duration-200 motion-reduce:delay-0 motion-reduce:duration-0"
              : "[stroke-dashoffset:1] opacity-0 duration-100 [@media(hover:hover)]:group-hover:[stroke-dashoffset:0] [@media(hover:hover)]:group-hover:opacity-40",
          )}
          style={checked ? undefined : { stroke: color }}
        />
      </svg>
    </span>
  );
}
