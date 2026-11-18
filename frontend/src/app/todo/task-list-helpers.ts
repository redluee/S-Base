import type { TodoMove } from "@backend/types/todo";

export const REORDER_EDGE_PX = 80;
export const REORDER_MAX_SCROLL = 18;
export const MOUSE_DRAG_THRESHOLD_PX = 5;
export const LONG_PRESS_CANCEL_PX = 10;

export interface SlotRect {
  top: number;
  height: number;
}

export function targetIndex(rects: SlotRect[], from: number, draggedCenter: number): number {
  let index = 0;
  for (const [i, rect] of rects.entries()) {
    if (i === from) continue;
    if (rect.top + rect.height / 2 < draggedCenter) index += 1;
  }
  return index;
}

export function shiftFor(index: number, from: number, to: number, height: number): number {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -height;
  if (from > to && index < from && index >= to) return height;
  return 0;
}

export function moveFromSlot(ids: number[], from: number, to: number): TodoMove | null {
  if (from === to || from < 0 || from >= ids.length) return null;
  const rest = ids.filter((_, i) => i !== from);
  const above = rest[to - 1] ?? null;
  const below = rest[to] ?? null;
  return above !== null ? { afterId: above, beforeId: null } : { afterId: null, beforeId: below };
}

export function edgeScrollSpeed(
  pointerY: number,
  viewportHeight: number,
  edge = REORDER_EDGE_PX,
  max = REORDER_MAX_SCROLL,
): number {
  if (pointerY < edge) return -Math.round(max * Math.min(1, (edge - Math.max(pointerY, 0)) / edge));
  if (pointerY > viewportHeight - edge) {
    return Math.round(max * Math.min(1, (pointerY - (viewportHeight - edge)) / edge));
  }
  return 0;
}

export function isHorizontalCancel(dx: number, pointerType: string): boolean {
  return Math.abs(dx) > LONG_PRESS_CANCEL_PX && pointerType !== "mouse";
}

export function exceedsThreshold(dx: number, dy: number, limit: number): boolean {
  return Math.hypot(dx, dy) > limit;
}

const REORDER_BLOCKERS = "a, input, textarea, select, [contenteditable]";

export function blocksReorder(target: { closest: (selector: string) => unknown } | null): boolean {
  return target !== null && target.closest(REORDER_BLOCKERS) !== null;
}
