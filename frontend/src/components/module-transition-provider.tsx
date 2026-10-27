"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type ModuleEntrance = {
  title: string;
  subtitle: string;
  color: string;
  icon: ReactNode;
  rect: DOMRect;
};

type Entrance = ModuleEntrance & { origin: string; key: number };

const TransitionContext = createContext<(entrance: ModuleEntrance) => void>(() => {});

export const useModuleTransition = () => useContext(TransitionContext);

export function ModuleTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  const sequence = useRef(0);
  const begin = useCallback((module: ModuleEntrance) => {
    setEntrance({ ...module, origin: pathname, key: ++sequence.current });
  }, [pathname]);
  const dismiss = useCallback(() => setEntrance(null), []);

  return (
    <TransitionContext.Provider value={begin}>
      {children}
      {entrance && createPortal(
        <ModuleEntranceOverlay key={entrance.key} entrance={entrance} pathname={pathname} dismiss={dismiss} />,
        document.body,
      )}
    </TransitionContext.Provider>
  );
}

function ModuleEntranceOverlay({ entrance, pathname, dismiss }: {
  entrance: Entrance;
  pathname: string;
  dismiss: () => void;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const identity = useRef<HTMLDivElement>(null);
  const entered = useRef<Promise<unknown>>(Promise.resolve());

  useLayoutEffect(() => {
    const stage = overlay.current;
    const panel = surface.current;
    const label = identity.current;
    if (!stage || !panel || !label) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { rect } = entrance;
    const transform = `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / window.innerWidth}, ${rect.height / window.innerHeight})`;
    const animations = [
      panel.animate(reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform }, { transform: "none" }],
      { duration: reduced ? 100 : 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }),
      label.animate(reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "translateY(8px) scale(0.97)" }, { opacity: 1, transform: "none" }],
      { duration: reduced ? 100 : 180, delay: reduced ? 0 : 60, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }),
    ];
    entered.current = Promise.allSettled(animations.map((animation) => animation.finished));
    const timeout = window.setTimeout(dismiss, 6000);
    const cancel = () => dismiss();
    window.addEventListener("popstate", cancel);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("popstate", cancel);
      window.removeEventListener("keydown", escape);
      animations.forEach((animation) => animation.cancel());
    };
  }, [entrance, dismiss]);

  useEffect(() => {
    if (pathname === entrance.origin) return;
    let cancelled = false;
    let reveal: Animation | undefined;
    void entered.current.then(async () => {
      if (cancelled || !overlay.current) return;
      reveal = overlay.current.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 120, easing: "ease-out", fill: "forwards",
      });
      await reveal.finished.catch(() => {});
      if (!cancelled) dismiss();
    });
    return () => {
      cancelled = true;
      reveal?.cancel();
    };
  }, [pathname, entrance.origin, dismiss]);

  return (
    <div ref={overlay} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      <div ref={surface} className="absolute inset-0 origin-top-left bg-zinc-950" />
      <div ref={identity} className="relative flex max-w-[85vw] flex-col items-center gap-4 text-center">
        <div className="relative flex size-16 items-center justify-center squircle-icon border border-white/10 bg-zinc-900 [&>svg]:size-8" style={{ color: entrance.color }}>
          {entrance.icon}
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{entrance.title}</p>
          <p className="mt-2 text-sm text-zinc-400">{entrance.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
