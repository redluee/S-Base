export type GestureOwner = "swipe" | "reorder";

let active: { pointerId: number; owner: GestureOwner } | null = null;

export function claimGesture(pointerId: number, owner: GestureOwner): boolean {
  if (active && active.pointerId === pointerId && active.owner !== owner) return false;
  active = { pointerId, owner };
  return true;
}

export function gestureOwner(pointerId: number): GestureOwner | null {
  return active?.pointerId === pointerId ? active.owner : null;
}

export function releaseGesture(pointerId: number): void {
  if (active?.pointerId === pointerId) active = null;
}

export const LONG_PRESS_MS = 300;
