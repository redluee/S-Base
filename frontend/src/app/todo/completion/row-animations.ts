"use client";

import {
  COLLAPSE_MS,
  DRAIN_MS,
  EASE_OUT,
  FILL_MS,
  GAP_OPEN_MS,
  SPRING_EASING,
  SQUASH_MS,
  SQUASH_SCALE,
  SWIPE_OUT_MS,
  UNSQUASH_MS,
  WAVE_MS,
  WAVE_OPACITY,
} from "./choreography";
import type { SwipeVisual } from "./swipe-progress";

export interface RowParts {
  outer: HTMLDivElement | null;
  inner: HTMLDivElement | null;
  wave: HTMLSpanElement | null;
  tint: HTMLSpanElement | null;
  completeStrip: HTMLDivElement | null;
  deleteStrip: HTMLDivElement | null;
}

const hold: KeyframeAnimationOptions = { fill: "forwards" };

export function paintSwipe(parts: RowParts, offset: number, visual: SwipeVisual, color: string): void {
  const { inner, tint, completeStrip, deleteStrip } = parts;
  if (inner) inner.style.transform = offset ? `translateX(${offset}px)` : "";
  if (tint) {
    tint.style.backgroundColor = visual.action === "delete" ? "var(--destructive)" : color;
    tint.style.opacity = String(visual.tintOpacity);
  }
  const strips: [HTMLDivElement | null, boolean][] = [
    [completeStrip, visual.action === "complete"],
    [deleteStrip, visual.action === "delete"],
  ];
  for (const [strip, active] of strips) {
    if (!strip) continue;
    strip.style.width = active ? `${Math.abs(offset)}px` : "0px";
    strip.style.opacity = active ? String(visual.stripOpacity) : "0";
    const icon = strip.firstElementChild as HTMLElement | null;
    if (icon) icon.style.transform = `scale(${active ? visual.iconScale : 0.6})`;
  }
}

export function springBack(parts: RowParts, offset: number): void {
  const { inner, tint, completeStrip, deleteStrip } = parts;
  const options = { duration: FILL_MS * 2, easing: SPRING_EASING };
  inner?.animate([{ transform: `translateX(${offset}px)` }, { transform: "translateX(0)" }], options);
  if (inner) inner.style.transform = "";
  for (const el of [tint, completeStrip, deleteStrip]) {
    if (!el) continue;
    el.animate([{ opacity: el.style.opacity || "0" }, { opacity: 0 }], { duration: FILL_MS * 2, easing: EASE_OUT });
    el.style.opacity = "0";
  }
  for (const strip of [completeStrip, deleteStrip]) {
    if (strip) strip.style.width = "0px";
  }
}

export function sweepWave(wave: HTMLSpanElement | null, reduced: boolean): void {
  if (!wave) return;
  const frames = reduced
    ? [{ opacity: 0 }, { opacity: WAVE_OPACITY }]
    : [
        { transform: "scaleX(0)", opacity: WAVE_OPACITY },
        { transform: "scaleX(1)", opacity: WAVE_OPACITY },
      ];
  wave.animate(frames, { duration: WAVE_MS, easing: EASE_OUT, ...hold });
}

export function squash(inner: HTMLDivElement | null): void {
  inner?.animate([{ transform: "scaleY(1)" }, { transform: `scaleY(${SQUASH_SCALE})`, opacity: 0.75 }], {
    duration: SQUASH_MS,
    easing: EASE_OUT,
    ...hold,
  });
}

export function collapse(parts: RowParts, duration = COLLAPSE_MS): void {
  const { outer, inner } = parts;
  if (!outer) return;
  inner?.animate([{ opacity: 0.75 }, { opacity: 0 }], { duration: 120, easing: EASE_OUT, ...hold });
  outer.animate([{ height: `${outer.offsetHeight}px` }, { height: "0px" }], {
    duration,
    easing: SPRING_EASING,
    ...hold,
  });
}

export function swipeOut(parts: RowParts, offset: number): void {
  const { inner, outer } = parts;
  const width = outer?.offsetWidth ?? 0;
  inner?.animate([{ transform: `translateX(${offset}px)` }, { transform: `translateX(${-width}px)` }], {
    duration: SWIPE_OUT_MS,
    easing: EASE_OUT,
    ...hold,
  });
  window.setTimeout(() => collapse(parts), SWIPE_OUT_MS);
}

export function playReturn(parts: RowParts, reduced: boolean): void {
  const { outer, inner, wave } = parts;
  if (outer) {
    outer.animate([{ height: "0px" }, { height: `${outer.offsetHeight}px` }], {
      duration: GAP_OPEN_MS,
      easing: SPRING_EASING,
    });
  }
  inner?.animate(
    [
      { transform: `scaleY(${SQUASH_SCALE})`, opacity: 0.75 },
      { transform: "scaleY(1)", opacity: 1 },
    ],
    { duration: UNSQUASH_MS, delay: GAP_OPEN_MS, easing: SPRING_EASING, fill: "backwards" },
  );
  if (!wave) return;
  const frames = reduced
    ? [{ opacity: WAVE_OPACITY }, { opacity: 0 }]
    : [
        { transform: "scaleX(1)", opacity: WAVE_OPACITY },
        { transform: "scaleX(0)", opacity: WAVE_OPACITY },
      ];
  wave.animate(frames, { duration: DRAIN_MS, delay: GAP_OPEN_MS + UNSQUASH_MS, easing: EASE_OUT, fill: "backwards" });
}
