import type { TodoMove } from "@backend/types/todo";

export const DISMISS_DISTANCE_PX = 96;
export const DISMISS_VELOCITY = 0.6;

export function shouldDismissDrag(dy: number, velocityY: number): boolean {
  return dy >= DISMISS_DISTANCE_PX || (dy > 24 && velocityY >= DISMISS_VELOCITY);
}

export interface DebouncedSaver<T> {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
  pending: () => boolean;
}

export function createDebouncedSaver<T>(save: (value: T) => void, delayMs: number): DebouncedSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let value: T | undefined;
  let has = false;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!has) return;
    const next = value as T;
    has = false;
    value = undefined;
    save(next);
  };
  return {
    schedule: (next) => {
      value = next;
      has = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, delayMs);
    },
    flush: run,
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      has = false;
      value = undefined;
    },
    pending: () => has,
  };
}

export function reorderIndex(centers: number[], pointerY: number): number {
  let index = 0;
  for (const center of centers) {
    if (pointerY > center) index += 1;
  }
  return index;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function moveForReorder(ids: number[], from: number, to: number): TodoMove | null {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return null;
  const rest = ids.filter((_, i) => i !== from);
  return { afterId: rest[to - 1] ?? null, beforeId: rest[to] ?? null };
}

export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const copy = items.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
