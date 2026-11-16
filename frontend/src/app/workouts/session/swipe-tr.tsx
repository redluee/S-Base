"use client";

import * as React from "react";
import {
  clampSwipeOffset,
  isSwipeDeleteArmed,
  resolveSwipeRelease,
  shouldEngageSwipe,
  swipeDeleteThreshold,
} from "@/app/workouts/session/swipe-gesture";

export const SWIPE_ACTION_WIDTH = 44;

function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query]
  );
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

export function useSmViewport(): boolean {
  return useMediaQuery("(min-width: 40rem)");
}

interface SwipeTrProps extends React.ComponentProps<"tr"> {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFullSwipe?: () => void;
}

interface SwipeDrag {
  id: number;
  x: number;
  y: number;
  t: number;
  engaged: boolean;
  base: number;
  travel: number;
  threshold: number;
  armed: boolean;
}

function setArmed(el: HTMLTableRowElement, armed: boolean) {
  if (armed) el.setAttribute("data-swipe-armed", "");
  else el.removeAttribute("data-swipe-armed");
}

export function SwipeTr({ enabled, open, onOpenChange, onFullSwipe, className, style, children, ...rest }: SwipeTrProps) {
  const ref = React.useRef<HTMLTableRowElement>(null);
  const drag = React.useRef<SwipeDrag | null>(null);
  const suppressClick = React.useRef(false);
  const offsetFor = (isOpen: boolean) => (enabled && isOpen ? -SWIPE_ACTION_WIDTH : 0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = offsetFor(open) ? `translateX(${offsetFor(open)}px)` : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enabled]);

  React.useEffect(() => {
    if (!enabled || !open) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest("[data-swipe-action]")) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled, open, onOpenChange]);

  if (!enabled) {
    return (
      <tr ref={ref} className={className} style={style} {...rest}>
        {children}
      </tr>
    );
  }

  const finish = (el: HTMLTableRowElement, nextOpen: boolean) => {
    setArmed(el, false);
    el.style.transition = "";
    el.style.transform = nextOpen ? `translateX(${-SWIPE_ACTION_WIDTH}px)` : "";
    if (nextOpen !== open) onOpenChange(nextOpen);
  };

  const finishDeleted = (el: HTMLTableRowElement, fullSwipe: () => void) => {
    setArmed(el, false);
    el.style.transition = "none";
    el.style.transform = "";
    void el.offsetWidth;
    el.style.transition = "";
    onOpenChange(false);
    fullSwipe();
  };

  return (
    <tr
      {...rest}
      ref={ref}
      style={style}
      className={`${className ?? ""} group/swipe [&>td]:touch-pan-y transition-transform duration-150 ease-out motion-reduce:transition-none`}
      onFocusCapture={(e) => {
        if ((e.target as HTMLElement).closest("[data-swipe-action]") && !open) {
          onOpenChange(true);
          requestAnimationFrame(() => {
            const clip = ref.current?.closest<HTMLElement>("[data-swipe-clip]");
            if (clip) clip.scrollLeft = 0;
          });
        }
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        const target = e.target as HTMLElement;
        if (target.closest("button, a, [data-swipe-action]")) return;
        const active = document.activeElement;
        if (active && active.tagName === "INPUT" && ref.current?.contains(active)) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, engaged: false, base: offsetFor(open), travel: SWIPE_ACTION_WIDTH, threshold: Infinity, armed: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const el = ref.current;
        if (!d || !el || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.engaged) {
          if (!shouldEngageSwipe(dx, dy)) return;
          d.engaged = true;
          el.setPointerCapture?.(e.pointerId);
          el.style.transition = "none";
          if (onFullSwipe) {
            const clip = el.closest<HTMLElement>("[data-swipe-clip]");
            d.travel = Math.max(SWIPE_ACTION_WIDTH, clip ? clip.clientWidth : el.offsetWidth - SWIPE_ACTION_WIDTH);
            d.threshold = swipeDeleteThreshold(d.travel);
          }
        }
        const offset = clampSwipeOffset(d.base, dx, d.travel);
        el.style.transform = `translateX(${offset}px)`;
        const armed = isSwipeDeleteArmed(offset, d.threshold);
        if (armed !== d.armed) {
          d.armed = armed;
          setArmed(el, armed);
          if (armed && typeof navigator.vibrate === "function") navigator.vibrate(10);
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        const el = ref.current;
        drag.current = null;
        if (!d || !el || d.id !== e.pointerId) return;
        if (!d.engaged) return;
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        const dx = e.clientX - d.x;
        const velocity = (e.clientX - d.x) / Math.max(1, e.timeStamp - d.t);
        const release = resolveSwipeRelease(clampSwipeOffset(d.base, dx, d.travel), SWIPE_ACTION_WIDTH, d.threshold, velocity);
        if (release === "delete" && onFullSwipe) finishDeleted(el, onFullSwipe);
        else finish(el, release !== "closed");
      }}
      onPointerCancel={() => {
        const d = drag.current;
        const el = ref.current;
        drag.current = null;
        if (d && el && d.engaged) finish(el, open);
      }}
    >
      {children}
    </tr>
  );
}
