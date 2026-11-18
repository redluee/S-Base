export interface SheetOrigin {
  rect: { left: number; top: number; width: number; height: number };
  radius: number;
  color: string | null;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const MORPH_MS = 420;
export const MORPH_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

export function originFrom(el: Element, color: string | null = null): SheetOrigin {
  const rect = el.getBoundingClientRect();
  const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return { rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, radius, color };
}

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

export function morphFrames(origin: Pick<SheetOrigin, "rect" | "radius">, target: Box, targetRadius: string): Keyframe[] {
  const { rect } = origin;
  const width = Math.min(rect.width, target.width);
  const height = Math.min(rect.height, target.height);
  const radius = Math.min(origin.radius, width / 2, height / 2);
  const right = target.width - width;
  const bottom = target.height - height;
  return [
    {
      transform: `translate(${px(rect.left - target.left)}, ${px(rect.top - target.top)})`,
      clipPath: `inset(0px ${px(right)} ${px(bottom)} 0px round ${px(radius)})`,
    },
    { transform: "translate(0px, 0px)", clipPath: `inset(0px 0px 0px 0px round ${targetRadius})` },
  ];
}
