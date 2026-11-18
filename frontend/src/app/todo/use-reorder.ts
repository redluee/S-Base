"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { TodoMove } from "@backend/types/todo";
import { haptic } from "./haptics";
import {
  blocksReorder,
  edgeScrollSpeed,
  exceedsThreshold,
  isHorizontalCancel,
  LONG_PRESS_CANCEL_PX,
  moveFromSlot,
  MOUSE_DRAG_THRESHOLD_PX,
  shiftFor,
  targetIndex,
  type SlotRect,
} from "./task-list-helpers";
import { claimGesture, LONG_PRESS_MS, releaseGesture } from "./todo-gestures";

interface DragView {
  id: number;
  dy: number;
  from: number;
  to: number;
  height: number;
}

interface Press {
  id: number;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startScroll: number;
  el: HTMLElement;
  active: boolean;
  rects: SlotRect[];
  from: number;
  to: number;
  timer: number | null;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useReorder(ids: number[], onMove: (id: number, move: TodoMove) => void) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const elements = useRef(new Map<number, HTMLElement>());
  const idsRef = useRef(ids);
  const onMoveRef = useRef(onMove);
  const press = useRef<Press | null>(null);
  const frame = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});

  useEffect(() => {
    idsRef.current = ids;
    onMoveRef.current = onMove;
  });

  useEffect(
    () => () => {
      const p = press.current;
      press.current = null;
      if (p?.timer != null) window.clearTimeout(p.timer);
      if (p) releaseGesture(p.pointerId);
      cleanup.current();
    },
    [],
  );

  const refresh = useCallback(() => {
    const p = press.current;
    if (!p?.active) return;
    const dy = p.y - p.startY + (window.scrollY - p.startScroll);
    const rect = p.rects[p.from];
    const to = targetIndex(p.rects, p.from, rect.top + rect.height / 2 + dy);
    if (to !== p.to) {
      p.to = to;
      haptic("tick");
    }
    setDrag({ id: p.id, dy, from: p.from, to, height: rect.height });
  }, []);

  const finish = useCallback((commit: boolean) => {
    const p = press.current;
    press.current = null;
    cleanup.current();
    cleanup.current = () => {};
    if (!p) return;
    if (p.timer !== null) window.clearTimeout(p.timer);
    releaseGesture(p.pointerId);
    if (p.active) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      setDrag(null);
      if (commit) {
        const move = moveFromSlot(idsRef.current, p.from, p.to);
        if (move) onMoveRef.current(p.id, move);
      }
    }
  }, []);

  const activate = useCallback(() => {
    const p = press.current;
    if (!p || p.active) return;
    if (!claimGesture(p.pointerId, "reorder")) {
      finish(false);
      return;
    }
    const scroll = window.scrollY;
    p.rects = idsRef.current.map((id) => {
      const box = elements.current.get(id)?.getBoundingClientRect();
      return { top: (box?.top ?? 0) + scroll, height: box?.height ?? 0 };
    });
    p.from = idsRef.current.indexOf(p.id);
    p.to = p.from;
    p.startScroll = scroll;
    p.active = true;
    try {
      p.el.setPointerCapture(p.pointerId);
    } catch {
      /* pointer already gone */
    }
    haptic("tick");

    const block = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    const block2 = (event: Event) => event.preventDefault();
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("contextmenu", block2);
    const tick = () => {
      const current = press.current;
      if (!current?.active) return;
      const speed = edgeScrollSpeed(current.y, window.innerHeight);
      if (speed !== 0) {
        window.scrollBy(0, speed);
        refresh();
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    const previous = cleanup.current;
    cleanup.current = () => {
      previous();
      window.removeEventListener("touchmove", block);
      window.removeEventListener("contextmenu", block2);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    refresh();
  }, [finish, refresh]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>, id: number) => {
      if (press.current || !event.isPrimary) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (blocksReorder(event.target instanceof Element ? event.target : null)) return;
      const p: Press = {
        id,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        startScroll: window.scrollY,
        el: event.currentTarget,
        active: false,
        rects: [],
        from: 0,
        to: 0,
        timer: null,
      };
      press.current = p;
      if (event.pointerType !== "mouse") p.timer = window.setTimeout(activate, LONG_PRESS_MS);

      const move = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== p.pointerId) return;
        p.x = e.clientX;
        p.y = e.clientY;
        if (p.active) {
          refresh();
          return;
        }
        const dx = p.x - p.startX;
        const dy = p.y - p.startY;
        if (p.pointerType === "mouse") {
          if (Math.abs(dx) > LONG_PRESS_CANCEL_PX && Math.abs(dx) > Math.abs(dy)) finish(false);
          else if (exceedsThreshold(dx, dy, MOUSE_DRAG_THRESHOLD_PX)) activate();
        } else if (isHorizontalCancel(dx, p.pointerType) || exceedsThreshold(dx, dy, LONG_PRESS_CANCEL_PX)) {
          finish(false);
        }
      };
      const up = (e: globalThis.PointerEvent) => {
        if (e.pointerId === p.pointerId) finish(e.type === "pointerup");
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      cleanup.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
    },
    [activate, finish, refresh],
  );

  const rowProps = (id: number, index: number) => {
    const calm = reducedMotion();
    let style: CSSProperties | undefined;
    if (drag) {
      if (drag.id === id) {
        style = {
          transform: `translate3d(0, ${drag.dy}px, 0)${calm ? "" : " scale(1.02)"}`,
          position: "relative",
          zIndex: 20,
          transition: "none",
        };
      } else {
        style = {
          transform: `translate3d(0, ${shiftFor(index, drag.from, drag.to, drag.height)}px, 0)`,
          transition: calm ? "none" : "transform 220ms cubic-bezier(0.34, 1.4, 0.64, 1)",
        };
      }
    }
    return {
      ref: (el: HTMLElement | null) => {
        if (el) elements.current.set(id, el);
        else elements.current.delete(id);
      },
      style,
      dragging: drag?.id === id,
      onPointerDown: (event: PointerEvent<HTMLElement>) => onPointerDown(event, id),
      onClickCapture: (event: { stopPropagation: () => void; preventDefault: () => void }) => {
        if (!suppressClick.current) return;
        event.stopPropagation();
        event.preventDefault();
      },
    };
  };

  return { dragging: drag !== null, rowProps };
}
