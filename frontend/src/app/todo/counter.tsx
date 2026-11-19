"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { t } from "@/lib/lang";
import { EASE_OUT } from "./completion/choreography";
import { prefersReducedMotion } from "./completion/use-reduced-motion";
import { counterDigits } from "./completion/counter-digits";

const ROLL_MS = 320;

interface SlotState {
  digit: string;
  previous: string | null;
  direction: 1 | -1;
  version: number;
}

function DigitSlot({ digit, direction }: { digit: string; direction: 1 | -1 }) {
  const [slot, setSlot] = useState<SlotState>({ digit, previous: null, direction, version: 0 });
  if (slot.digit !== digit) setSlot({ digit, previous: slot.digit, direction, version: slot.version + 1 });
  const nextRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (slot.version === 0 || prefersReducedMotion()) return;
    const options = { duration: ROLL_MS, easing: EASE_OUT, fill: "forwards" as const };
    const from = `${slot.direction * 100}%`;
    const to = `${-slot.direction * 100}%`;
    const enter = nextRef.current?.animate([{ transform: `translateY(${from})` }, { transform: "translateY(0)" }], options);
    const exit = prevRef.current?.animate([
        { transform: "translateY(0)", opacity: 1 },
        { transform: `translateY(${to})`, opacity: 1 },
      ], options);
    return () => {
      enter?.cancel();
      exit?.cancel();
    };
  }, [slot.version, slot.direction]);

  return (
    <span className="relative inline-block overflow-hidden">
      {slot.previous !== null && (
        <span ref={prevRef} key={`p${slot.version}`} className="absolute inset-0 opacity-0">
          {slot.previous}
        </span>
      )}
      <span ref={nextRef} key={`n${slot.version}`} className="block">
        {slot.digit}
      </span>
    </span>
  );
}

export function Counter({ value, onClick }: { value: number; onClick: () => void }) {
  const [state, setState] = useState({ value, direction: 1 as 1 | -1 });
  if (state.value !== value) setState({ value, direction: value > state.value ? 1 : -1 });
  const digits = counterDigits(value);

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {t("todo.header.counter", { count: String(value) })}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${t("todo.header.history")}: ${t("todo.header.counter", { count: String(value) })}`}
        title={t("todo.header.history")}
        className="relative mr-1 flex h-8 items-center gap-1 rounded-full bg-foreground/[0.06] pr-2.5 pl-2 text-sm text-foreground tabular-nums ring-1 ring-foreground/10 transition-[background-color,scale] duration-150 ease-out before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-foreground/10 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Check className="size-3.5 text-brand" strokeWidth={3} aria-hidden="true" />
        <span aria-hidden="true" className="flex">
          {digits.map(({ key, digit }) => (
            <DigitSlot key={key} digit={digit} direction={state.direction} />
          ))}
        </span>
      </button>
    </>
  );
}
