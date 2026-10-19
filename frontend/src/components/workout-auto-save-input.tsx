"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { parseDecimal, parseInteger, sanitizeDecimalInput, sanitizeIntegerInput } from "@/lib/number-input";
import type { InputKind } from "@/components/workout-exercise-card-utils";

interface AutoSaveInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> {
  kind: InputKind;
  value: string;
  onSave: (val: string) => void;
}

function sameInputValue(kind: InputKind, a: string, b: string): boolean {
  if (kind === "decimal") return parseDecimal(a) === parseDecimal(b);
  if (kind === "integer") return parseInteger(a) === parseInteger(b);
  return a.trim() === b.trim();
}

export function AutoSaveInput({ kind, value, onSave, className, ...props }: AutoSaveInputProps) {
  const [{ localValue, edited }, setDraft] = useState({ localValue: value, edited: false });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ localValue: value, edited: false });
  }, [value]);

  const handleBlur = () => {
    if (edited || !sameInputValue(kind, localValue, value)) {
      onSave(localValue);
      setDraft({ localValue, edited: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = kind === "decimal" ? sanitizeDecimalInput(raw)
      : kind === "integer" ? sanitizeIntegerInput(raw)
        : raw.replace(/[^0-9:]/g, "").slice(0, 8);
    setDraft({ localValue: sanitized, edited: true });
  };

  return (
    <Input
      {...props}
      className={cn(className, edited && "text-foreground not-italic font-semibold")}
      type="text"
      inputMode={kind === "decimal" ? "decimal" : "numeric"}
      enterKeyHint="done"
      autoComplete="off"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
