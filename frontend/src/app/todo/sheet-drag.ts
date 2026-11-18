export const SHEET_CLOSE_DISTANCE = 120;
export const SHEET_CLOSE_FRACTION = 0.25;
export const SHEET_FLICK_VELOCITY = 0.5;
export const SHEET_FLICK_MIN_DISTANCE = 24;

export interface SheetDragEnd {
  distance: number;
  velocity: number;
  height: number;
}

export function sheetDragOffset(distance: number): number {
  return distance > 0 ? distance : distance / 4;
}

export function shouldCloseSheet({ distance, velocity, height }: SheetDragEnd): boolean {
  if (distance <= 0) return false;
  if (velocity >= SHEET_FLICK_VELOCITY && distance >= SHEET_FLICK_MIN_DISTANCE) return true;
  const threshold = height > 0 ? Math.min(SHEET_CLOSE_DISTANCE, height * SHEET_CLOSE_FRACTION) : SHEET_CLOSE_DISTANCE;
  return distance >= threshold;
}

export function keyboardInset(
  innerHeight: number,
  viewport: { height: number; offsetTop: number } | null | undefined,
): number {
  if (!viewport) return 0;
  return Math.max(0, Math.round(innerHeight - viewport.height - viewport.offsetTop));
}
