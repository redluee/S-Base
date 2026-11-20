"use client";

import { useId } from "react";
import { smoothPath } from "@/app/workouts/(main)/exercises/progress-stats";

const W = 320;
const H = 170;
const PAD_X = 12;
const PAD_TOP = 24;
const PAD_BOTTOM = 18;

export function ProgressChart({ values, labels }: { values: number[]; labels: string[] }) {
  const gradientId = useId();
  const glowId = useId();
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => ({
    x: values.length > 1 ? PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2) : W / 2,
    y: Math.round((H - PAD_BOTTOM - ((v - min) / span) * (H - PAD_TOP - PAD_BOTTOM)) * 100) / 100,
  }));
  const line = smoothPath(points);
  const area = `${line} L${points.at(-1)!.x},${H} L${points[0].x},${H} Z`;
  const markerStep = Math.max(1, Math.ceil(values.length / 6));
  const markers = points.filter((_, i) => i % markerStep === 0 || i === points.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={labels.join(", ")}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="0"
          x2={W}
          y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
          y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="2 4"
        />
      ))}
      {points.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
      {points.length > 1 && (
        <path
          d={line}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="3"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />
      )}
      {markers.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="5"
          fill="var(--card)"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}
