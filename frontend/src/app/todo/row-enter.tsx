"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { EASE_OUT, SPRING_EASING } from "./completion/choreography";
import { prefersReducedMotion } from "./completion/use-reduced-motion";

const OPEN_MS = 340;
const RISE_MS = 380;
const RISE_DELAY_MS = 70;
const GLOW_MS = 1100;

interface RowEnterProps {
  readyRef: RefObject<boolean>;
  skip: boolean;
  color: string;
  children: ReactNode;
}

export function RowEnter({ readyRef, skip, color, children }: RowEnterProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const skipRef = useRef(skip);

  useLayoutEffect(() => {
    const box = outer.current;
    if (!readyRef.current || skipRef.current || !box) return;
    if (prefersReducedMotion()) {
      const fade = box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT });
      return () => fade.cancel();
    }
    const height = box.offsetHeight;
    const animations = [
      box.animate([{ height: "0px" }, { height: `${height}px` }], { duration: OPEN_MS, easing: EASE_OUT }),
      inner.current?.animate(
        [
          { opacity: 0, transform: "translateY(-10px) scale(0.97)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        { duration: RISE_MS, delay: RISE_DELAY_MS, easing: SPRING_EASING, fill: "backwards" },
      ),
      glow.current?.animate([{ opacity: 0.16 }, { opacity: 0.16, offset: 0.3 }, { opacity: 0 }], {
        duration: GLOW_MS,
        delay: RISE_DELAY_MS,
        easing: "ease-out",
        fill: "backwards",
      }),
    ];
    return () => {
      for (const animation of animations) animation?.cancel();
    };
  }, [readyRef]);

  return (
    <div ref={outer} className="relative overflow-hidden">
      <span
        ref={glow}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ backgroundColor: color }}
      />
      <div ref={inner} className="relative">
        {children}
      </div>
    </div>
  );
}
