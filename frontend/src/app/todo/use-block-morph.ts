"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { flipCss, flipTransform, prefersReducedMotion, shouldDismissDrag } from "./block-motion";

const OPEN_MS = 340;
const CLOSE_MS = 260;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

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
    const start = flipCss(flipTransform(from, el.getBoundingClientRect()));
    el.animate(
      [
        { transform: start, transformOrigin: "top left" },
        { transform: "none", transformOrigin: "top left" },
      ],
      { duration: OPEN_MS, easing: EASE },
    );
    content.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: OPEN_MS - 120,
      delay: 120,
      easing: "ease-out",
      fill: "backwards",
    });
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
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: "ease-in", fill: "forwards" });
    const target = originRef.current;
    const keyframes: Keyframe[] =
      !target || prefersReducedMotion()
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { transform: `translateY(${fromDy}px)`, transformOrigin: "top left" },
            {
              transform: flipCss(flipTransform(target, el.getBoundingClientRect())),
              transformOrigin: "top left",
            },
          ];
    const animation = el.animate(keyframes, {
      duration: !target || prefersReducedMotion() ? 140 : CLOSE_MS,
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
