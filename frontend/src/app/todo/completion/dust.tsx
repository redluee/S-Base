"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { DUST_MS, EASE_OUT } from "./choreography";
import type { DustParticle } from "./dust-particles";

export interface DustBurstData {
  id: number;
  color: string;
  particles: DustParticle[];
}

function DustBurst({ burst, onDone }: { burst: DustBurstData; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spans = ref.current ? Array.from(ref.current.children) : [];
    const animations = spans.map((span, i) => {
      const p = burst.particles[i];
      return span.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${p.dx * 0.7}px, ${p.dy * 0.7}px) scale(0.9)`, opacity: 0.8, offset: 0.5 },
          { transform: `translate(${p.dx}px, ${p.dy}px) scale(0.4)`, opacity: 0 },
        ],
        { duration: p.duration, delay: p.delay, easing: EASE_OUT, fill: "both" },
      );
    });
    const id = window.setTimeout(() => onDone(burst.id), DUST_MS * 1.2);
    return () => {
      window.clearTimeout(id);
      for (const animation of animations) animation.cancel();
    };
  }, [burst, onDone]);

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      {burst.particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: burst.color }}
        />
      ))}
    </div>
  );
}

export function DustLayer({ bursts, onDone }: { bursts: DustBurstData[]; onDone: (id: number) => void }) {
  if (bursts.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    bursts.map((burst) => <DustBurst key={burst.id} burst={burst} onDone={onDone} />),
    document.body,
  );
}
