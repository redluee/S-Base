"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { EASE_OUT } from "./completion/choreography";
import { prefersReducedMotion, shouldDismissDrag } from "./block-motion";
import { MORPH_EASING, morphFrames } from "./sheet-morph";

const OPEN_MS = 400;
const CLOSE_MS = 300;
const EASE = MORPH_EASING;
const ROW_RADIUS = 12;

function cardRadius(el: HTMLElement): string {
  return getComputedStyle(el).borderTopLeftRadius;
}

function fadeChildren(el: HTMLElement, show: boolean, options: KeyframeAnimationOptions): void {
  const frames = [
    { opacity: 0, transform: "translateY(4px)" },
    { opacity: 1, transform: "translateY(0)" },
  ];
  for (const child of el.children) child.animate(show ? frames : [...frames].reverse(), options);
}

interface Options {
  origin: DOMRect | null;
  beforeClose: () => void;
  onClosed: () => void;
}

export function useBlockMorph({ origin, beforeClose, onClosed }: Options) {
  const card = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const drag = useRef<{ y: number; at: number; dy: number } | null>(null);
  const originRef = useRef(origin);
  const callbacks = useRef({ beforeClose, onClosed });

  useEffect(() => {
    callbacks.current = { beforeClose, onClosed };
  });

  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const fade = { duration: 160, easing: "ease-out" } as const;
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease-out" });
    const from = originRef.current;
    if (!from || prefersReducedMotion()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], fade);
      return;
    }
    const [collapsed, full] = morphFrames({ rect: from, radius: ROW_RADIUS }, el.getBoundingClientRect(), cardRadius(el));
    el.animate([{ ...collapsed, opacity: 0 }, { offset: 0.2, opacity: 1 }, { ...full, opacity: 1 }], {
      duration: OPEN_MS,
      easing: EASE,
    });
    fadeChildren(el, true, { duration: 240, delay: 110, easing: EASE_OUT, fill: "backwards" });
  }, []);

  const close = useCallback((fromDy = 0) => {
    if (closing.current) return;
    closing.current = true;
    callbacks.current.beforeClose();
    const el = card.current;
    const finish = () => callbacks.current.onClosed();
    if (!el) {
      finish();
      return;
    }
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: EASE_OUT,
      fill: "forwards",
    });
    const target = originRef.current;
    if (!target || prefersReducedMotion()) {
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: EASE_OUT, fill: "forwards" });
      fade.onfinish = finish;
      fade.oncancel = finish;
      return;
    }
    const box = el.getBoundingClientRect();
    const [collapsed, full] = morphFrames({ rect: target, radius: ROW_RADIUS }, box, cardRadius(el));
    fadeChildren(el, false, { duration: 120, easing: EASE_OUT, fill: "forwards" });
    const frames: Keyframe[] = [
      { ...full, transform: `translate(0px, ${fromDy}px)`, opacity: 1 },
      { offset: 0.7, opacity: 1 },
      { ...collapsed, opacity: 0 },
    ];
    const animation = el.animate(frames, {
      duration: CLOSE_MS,
      delay: 40,
      easing: EASE,
      fill: "forwards",
    });
    animation.onfinish = finish;
    animation.oncancel = finish;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const grabber = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { y: e.clientY, at: performance.now(), dy: 0 };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || !card.current) return;
      d.dy = Math.max(0, e.clientY - d.y);
      card.current.style.transform = `translateY(${d.dy}px)`;
      if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0.2, 1 - d.dy / 400));
    },
    onPointerUp: () => {
      const d = drag.current;
      drag.current = null;
      const el = card.current;
      if (!d || !el) return;
      const velocity = d.dy / Math.max(1, performance.now() - d.at);
      if (shouldDismissDrag(d.dy, velocity)) {
        el.style.transform = "";
        if (backdrop.current) backdrop.current.style.opacity = "";
        close(d.dy);
        return;
      }
      el.animate([{ transform: `translateY(${d.dy}px)` }, { transform: "none" }], { duration: 180, easing: EASE });
      el.style.transform = "";
      if (backdrop.current) backdrop.current.style.opacity = "";
    },
    onPointerCancel: () => {
      drag.current = null;
      if (card.current) card.current.style.transform = "";
      if (backdrop.current) backdrop.current.style.opacity = "";
    },
  };

  return { card, backdrop, content, close, grabber };
}
