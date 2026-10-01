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
