"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { shouldEngageSwipe } from "@/app/workouts/session/swipe-gesture";
import { claimGesture, gestureOwner, releaseGesture } from "../todo-gestures";
import { haptic } from "../haptics";
import { clampSwipe, resolveSwipe, swipeThreshold, swipeVisual, type SwipeAction } from "./swipe-progress";

interface Drag {
  id: number;
  x: number;
  y: number;
  engaged: boolean;
  threshold: number;
  width: number;
  offset: number;
  armed: boolean;
}

export interface RowSwipeOptions {
  enabled: () => boolean;
  rowWidth: () => number;
  paint: (offset: number, visual: ReturnType<typeof swipeVisual>) => void;
  onRelease: (action: SwipeAction | null, offset: number) => void;
}

export function useRowSwipe({ enabled, rowWidth, paint, onRelease }: RowSwipeOptions) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const end = (e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    releaseGesture(e.pointerId);
    if (!d.engaged) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    onRelease(cancelled ? null : resolveSwipe(d.offset, d.threshold), d.offset);
  };

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.pointerType === "mouse" || !enabled()) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        engaged: false,
        threshold: Infinity,
        width: 0,
        offset: 0,
        armed: false,
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      if (!d.engaged) {
        if (gestureOwner(e.pointerId) === "reorder") {
          drag.current = null;
          return;
        }
        if (!shouldEngageSwipe(dx, e.clientY - d.y)) return;
        if (!claimGesture(e.pointerId, "swipe")) {
          drag.current = null;
          return;
        }
        d.engaged = true;
        d.width = rowWidth();
        d.threshold = swipeThreshold(window.innerWidth);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      d.offset = clampSwipe(dx, d.width);
      const visual = swipeVisual(d.offset, d.threshold);
      if (visual.armed !== d.armed) {
        d.armed = visual.armed;
        if (visual.armed) haptic("threshold");
      }
      paint(d.offset, visual);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => end(e, false),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, true),
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
