"use client";

import type { TodoPulsePoint } from "@backend/types/todo";
import { useMemo } from "react";
import { t } from "@/lib/lang";
import { pulsePath } from "./history-helpers";

const WIDTH = 600;
const HEIGHT = 48;

export function PulseGraph({ points }: { points: TodoPulsePoint[] }) {
  const path = useMemo(() => pulsePath(points, WIDTH, HEIGHT), [points]);
  if (!path) return <div className="h-12" aria-hidden="true" />;
  return (
    <svg
      role="img"
      aria-label={t("todo.history.pulse")}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-12 w-full pointer-events-none"
    >
      <path
        d={path}
        fill="none"
        stroke="#00e3a4"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
