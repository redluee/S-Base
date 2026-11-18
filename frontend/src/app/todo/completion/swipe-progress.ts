export const SWIPE_TRIGGER_RATIO = 0.25;
export const SWIPE_MIN_THRESHOLD_PX = 64;
export const SWIPE_TINT_MAX = 0.45;

export type SwipeAction = "delete" | "complete";

export interface SwipeVisual {
  action: SwipeAction | null;
  progress: number;
  armed: boolean;
  tintOpacity: number;
  stripOpacity: number;
  iconScale: number;
}

export function swipeThreshold(screenWidth: number): number {
  return Math.max(SWIPE_MIN_THRESHOLD_PX, screenWidth * SWIPE_TRIGGER_RATIO);
}

export function clampSwipe(dx: number, rowWidth: number): number {
  return Math.max(-rowWidth, Math.min(rowWidth, dx));
}

export function swipeAction(offset: number): SwipeAction | null {
  if (offset < 0) return "delete";
  if (offset > 0) return "complete";
  return null;
}

export function swipeVisual(offset: number, threshold: number): SwipeVisual {
  const action = swipeAction(offset);
  const progress = threshold > 0 ? Math.min(1, Math.abs(offset) / threshold) : 0;
  const armed = action !== null && progress >= 1;
  return {
    action,
    progress,
    armed,
    tintOpacity: armed ? SWIPE_TINT_MAX : progress * SWIPE_TINT_MAX * 0.7,
    stripOpacity: armed ? 1 : 0.35 + progress * 0.45,
    iconScale: armed ? 1.15 : 0.6 + progress * 0.4,
  };
}

export function resolveSwipe(offset: number, threshold: number): SwipeAction | null {
  return swipeVisual(offset, threshold).armed ? swipeAction(offset) : null;
}
