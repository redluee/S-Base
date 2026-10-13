"use client";

import React, { useState, useEffect } from "react";
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

export function AutoSaveInput({ kind, value, onSave, ...props }: AutoSaveInputProps) {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (!sameInputValue(kind, localValue, value)) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (kind === "decimal") setLocalValue(sanitizeDecimalInput(raw));
    else if (kind === "integer") setLocalValue(sanitizeIntegerInput(raw));
    else setLocalValue(raw.replace(/[^0-9:]/g, "").slice(0, 8));
  };

  return (
    <Input
      {...props}
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
