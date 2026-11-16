export const TAP_SLOP_PX = 10;

export type PointerPoint = {
  pointerId: number;
  x: number;
  y: number;
};

export function isTap(down: PointerPoint | null, up: PointerPoint, slop: number = TAP_SLOP_PX): boolean {
  if (!down || down.pointerId !== up.pointerId) return false;
  return Math.hypot(up.x - down.x, up.y - down.y) < slop;
}
