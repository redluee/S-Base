"use client";

import { EASE_OUT } from "./completion/choreography";
import { MORPH_EASING, morphFrames, originFrom, type SheetOrigin } from "./sheet-morph";

export const LAUNCH_MS = 520;
const ROW_RADIUS = "12px";
const FRESH_MS = 2000;

let pending: { origin: SheetOrigin; title: string; at: number } | null = null;

export function armLaunch(button: Element | null, title: string): void {
  if (!button) return;
  pending = { origin: originFrom(button, getComputedStyle(button).backgroundColor), title, at: performance.now() };
}

export function takeLaunch(title: string): SheetOrigin | null {
  if (!pending || pending.title !== title || performance.now() - pending.at > FRESH_MS) return null;
  return pending.origin;
}

export function flyIntoRow(origin: SheetOrigin, row: HTMLElement, height: number, background: string): Animation[] {
  const rect = row.getBoundingClientRect();
  const target = { left: rect.left, top: rect.top, width: rect.width, height };
  const ghost = row.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${target.left}px`,
    top: `${target.top}px`,
    width: `${target.width}px`,
    height: `${height}px`,
    margin: "0",
    zIndex: "60",
    pointerEvents: "none",
    backgroundColor: background,
    borderRadius: ROW_RADIUS,
    overflow: "hidden",
  });
  document.body.appendChild(ghost);

  const animations = [
    ghost.animate(morphFrames(origin, target, ROW_RADIUS), { duration: LAUNCH_MS, easing: MORPH_EASING }),
    ghost.animate(
      [{ backgroundColor: origin.color ?? background }, { backgroundColor: origin.color ?? background, offset: 0.2 }, { backgroundColor: background }],
      { duration: LAUNCH_MS * 0.7, easing: EASE_OUT, fill: "forwards" },
    ),
  ];
  for (const child of ghost.children) {
    animations.push(
      child.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], {
        duration: LAUNCH_MS,
        easing: EASE_OUT,
      }),
    );
  }
  const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 160,
    delay: LAUNCH_MS,
    easing: "ease-out",
    fill: "forwards",
  });
  animations.push(fade);
  const remove = () => ghost.remove();
  fade.finished.then(remove, remove);
  return animations;
}
