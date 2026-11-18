"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { keyboardInset, sheetDragOffset, shouldCloseSheet } from "./sheet-drag";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  header?: ReactNode;
  sheetRef?: (el: HTMLDivElement | null) => void;
  autoFocus?: boolean;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => setInset(keyboardInset(window.innerHeight, viewport));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);
  return inset;
}

export function BottomSheet({
  open,
  onClose,
  label,
  children,
  header,
  sheetRef,
  autoFocus = true,
  className,
}: BottomSheetProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startY: number; startTime: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const inset = useKeyboardInset(open);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    el.inert = !open;
    if (!open) return;
    const active = document.activeElement;
    const previous = active instanceof HTMLElement && !el.contains(active) ? active : null;
    if (autoFocus && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
      if (previous?.isConnected && el.contains(document.activeElement)) previous.focus({ preventScroll: true });
    };
  }, [open, autoFocus]);

  const setRefs = (el: HTMLDivElement | null) => {
    panel.current = el;
    sheetRef?.(el);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest("button, input, a, select, textarea")) return;
    drag.current = { pointerId: e.pointerId, startY: e.clientY, startTime: e.timeStamp };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    setOffset(sheetDragOffset(e.clientY - drag.current.startY));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start?.pointerId !== e.pointerId) return;
    drag.current = null;
    const distance = e.clientY - start.startY;
    const elapsed = Math.max(1, e.timeStamp - start.startTime);
    setOffset(0);
    if (shouldCloseSheet({ distance, velocity: distance / elapsed, height: panel.current?.offsetHeight ?? 0 })) {
      onClose();
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={setRefs}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          bottom: inset || undefined,
          transform: open && offset !== 0 ? `translateY(${offset}px)` : undefined,
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[85dvh] w-full max-w-[640px] flex-col rounded-t-2xl bg-card text-card-foreground outline-none ring-1 ring-foreground/10",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:rounded-2xl sm:pb-3",
          offset === 0 && "motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
          className,
        )}
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex h-5 items-center justify-center">
            <span className="h-1 w-10 rounded-full bg-foreground/20" />
          </div>
          {header}
        </div>
        {children}
      </div>
    </>
  );
}

