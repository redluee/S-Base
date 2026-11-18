"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, GripVertical, Trash2 } from "lucide-react";
import type { TodoSubtask } from "@backend/types/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, createDebouncedSaver } from "./block-motion";
import { haptic } from "./haptics";
import {
  clampSwipeOffset,
  isSwipeDeleteArmed,
  shouldEngageSwipe,
  swipeDeleteThreshold,
} from "../workouts/session/swipe-gesture";

export interface HandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

interface Props {
  subtask: TodoSubtask;
  color: string;
  dragOffset: number | null;
  handle: HandleProps;
  rowRef: (el: HTMLDivElement | null) => void;
  onToggle: (done: boolean) => void;
  onTitle: (title: string) => void;
  onRemove: () => void;
}

function playWave(el: HTMLElement, color: string) {
  if (prefersReducedMotion()) return;
  el.animate(
    [
      { transform: "scaleX(0)", opacity: 0.35 },
      { transform: "scaleX(1)", opacity: 0.35, offset: 0.6 },
      { transform: "scaleX(1)", opacity: 0 },
    ],
    { duration: 380, easing: "ease-out" },
  );
  el.style.backgroundColor = color;
}

export function SubtaskRow({ subtask, color, dragOffset, handle, rowRef, onToggle, onTitle, onRemove }: Props) {
  const [title, setTitle] = useState(subtask.title);
  const [offset, setOffset] = useState(0);
  const [armed, setArmed] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const wave = useRef<HTMLSpanElement>(null);
  const swipe = useRef<{ x: number; y: number; width: number; engaged: boolean; armed: boolean } | null>(null);
  const lastSaved = useRef(subtask.title);
  const saver = useRef<ReturnType<typeof createDebouncedSaver<string>> | null>(null);
  const titleRef = useRef(onTitle);

  useEffect(() => {
    titleRef.current = onTitle;
  });

  useEffect(() => {
    const instance = createDebouncedSaver<string>((value) => {
      const next = value.trim();
      if (!next || next === lastSaved.current) return;
      lastSaved.current = next;
      titleRef.current(next);
    }, 400);
    saver.current = instance;
    return () => instance.flush();
  }, []);

  useEffect(() => {
    if (subtask.title !== lastSaved.current) {
      lastSaved.current = subtask.title;
      setTitle(subtask.title);
    }
  }, [subtask.title]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY, width: e.currentTarget.offsetWidth, engaged: false, armed: false };
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!s.engaged) {
      if (!shouldEngageSwipe(dx, e.clientY - s.y)) return;
      s.engaged = true;
      setSwiping(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const next = clampSwipeOffset(0, dx, s.width);
    const nowArmed = isSwipeDeleteArmed(next, swipeDeleteThreshold(s.width));
    if (nowArmed !== s.armed) {
      s.armed = nowArmed;
      setArmed(nowArmed);
      if (nowArmed) haptic("threshold");
    }
    setOffset(next);
  };

  const onUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (s?.engaged && s.armed) {
      onRemove();
      return;
    }
    setOffset(0);
    setArmed(false);
    setSwiping(false);
  };

  return (
    <div
      ref={rowRef}
      className={cn("relative overflow-hidden rounded-lg", dragOffset !== null && "z-10 bg-card shadow-none ring-1 ring-border")}
      style={dragOffset !== null ? { transform: `translateY(${dragOffset}px)` } : undefined}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-end pr-4 transition-colors",
          armed ? "bg-red-500/80 text-white" : "bg-red-500/25 text-red-300",
        )}
      >
        <Trash2 className="size-5" />
      </div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative flex min-h-11 touch-pan-y items-center gap-1 bg-card"
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: swiping ? "none" : "transform 180ms ease-out",
        }}
      >
        <span ref={wave} aria-hidden className="pointer-events-none absolute inset-0 origin-left opacity-0" />
        <button
          type="button"
          role="checkbox"
          aria-checked={subtask.done}
          aria-label={subtask.title}
          onClick={() => {
            if (!subtask.done && wave.current) playWave(wave.current, color);
            haptic("tick");
            onToggle(!subtask.done);
          }}
          className="relative flex size-11 shrink-0 items-center justify-center"
        >
          <span
            className="flex size-5 items-center justify-center rounded-full border-2 transition-colors"
            style={{ borderColor: color, backgroundColor: subtask.done ? color : "transparent" }}
          >
            {subtask.done && <Check className="size-3 text-black" strokeWidth={3.5} />}
          </span>
        </button>
        <input
          value={title}
          maxLength={200}
          aria-label={t("todo.block.subtaskPlaceholder")}
          onChange={(e) => {
            setTitle(e.target.value);
            saver.current?.schedule(e.target.value);
          }}
          onBlur={() => {
            saver.current?.flush();
            if (!title.trim()) setTitle(lastSaved.current);
          }}
          className={cn(
            "relative min-h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none",
            subtask.done && "text-muted-foreground line-through",
          )}
        />
        <span
          {...handle}
          role="presentation"
          aria-label={t("todo.row.reorder")}
          className="relative flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground"
        >
          <GripVertical className="size-4" />
        </span>
      </div>
    </div>
  );
}
