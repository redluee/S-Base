export const SWIPE_ENGAGE_PX = 10;

export function shouldEngageSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SWIPE_ENGAGE_PX && Math.abs(dx) > Math.abs(dy) * 1.5;
}

export function clampSwipeOffset(base: number, dx: number, width: number): number {
  return Math.min(0, Math.max(-width, base + dx));
}

export function settleSwipeOpen(offset: number, width: number, velocityX = 0): boolean {
  if (velocityX < -0.5) return true;
  if (velocityX > 0.5) return false;
  return offset < -width / 2;
}

export const SWIPE_DELETE_MIN_PX = 96;
export const SWIPE_DELETE_RATIO = 0.28;

export type SwipeRelease = "closed" | "open" | "delete";

export function swipeDeleteThreshold(rowWidth: number): number {
  return Math.max(SWIPE_DELETE_MIN_PX, rowWidth * SWIPE_DELETE_RATIO);
}

export function isSwipeDeleteArmed(offset: number, deleteThreshold: number): boolean {
  return offset <= -deleteThreshold;
}

export function resolveSwipeRelease(
  offset: number,
  actionWidth: number,
  deleteThreshold: number,
  velocityX = 0
): SwipeRelease {
  if (isSwipeDeleteArmed(offset, deleteThreshold)) return "delete";
  return settleSwipeOpen(Math.max(offset, -actionWidth), actionWidth, velocityX) ? "open" : "closed";
}
