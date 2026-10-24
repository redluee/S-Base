"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/finance";

export function AnimatedMoney({ cents }: { cents: number | null }) {
  return cents === null ? money(null) : <Counter key={cents} cents={cents} />;
}

function Counter({ cents }: { cents: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number;
    const start = performance.now();
    function animate(now: number) {
      const progress = motion.matches ? 1 : Math.min(1, (now - start) / 800);
      setValue(Math.round(cents * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cents]);
  return <>
    <span className="sr-only">{money(cents)}</span>
    <span aria-hidden="true" className="motion-reduce:hidden">{money(value)}</span>
    <span aria-hidden="true" className="hidden motion-reduce:inline">{money(cents)}</span>
  </>;
}
