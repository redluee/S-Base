"use client";

import * as React from "react";
import { clampSwipeOffset, settleSwipeOpen, shouldEngageSwipe } from "@/lib/swipe-gesture";

export const SWIPE_ACTION_WIDTH = 44;

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useCoarsePointer(): boolean {
  return React.useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

interface SwipeTrProps extends React.ComponentProps<"tr"> {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SwipeTr({ enabled, open, onOpenChange, className, style, children, ...rest }: SwipeTrProps) {
  const ref = React.useRef<HTMLTableRowElement>(null);
  const drag = React.useRef<{ id: number; x: number; y: number; t: number; engaged: boolean; base: number } | null>(null);
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
      <tr className={className} style={style} {...rest}>
        {children}
      </tr>
    );
  }

  const finish = (el: HTMLTableRowElement, nextOpen: boolean) => {
    el.style.transition = "";
    el.style.transform = nextOpen ? `translateX(${-SWIPE_ACTION_WIDTH}px)` : "";
    if (nextOpen !== open) onOpenChange(nextOpen);
  };

  return (
    <tr
      {...rest}
      ref={ref}
      style={style}
      className={`${className ?? ""} [&>td]:touch-pan-y transition-transform duration-150 ease-out motion-reduce:transition-none`}
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
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, engaged: false, base: offsetFor(open) };
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
        }
        el.style.transform = `translateX(${clampSwipeOffset(d.base, dx, SWIPE_ACTION_WIDTH)}px)`;
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
        finish(el, settleSwipeOpen(clampSwipeOffset(d.base, dx, SWIPE_ACTION_WIDTH), SWIPE_ACTION_WIDTH, velocity));
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
