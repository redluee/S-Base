"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      
      if (!raw) {
        setDisplayValue("");
        onChange("");
        return;
      }

      let digitsOnly = raw.replace(/\D/g, "");
      
      if (displayValue.endsWith(":") && raw === displayValue.slice(0, -1)) {
        digitsOnly = digitsOnly.slice(0, -1);
      }
      
      const truncated = digitsOnly.slice(0, 4);
      
      let formatted = truncated;
      
      if (truncated.length >= 2) {
        const mm = truncated.slice(0, 2);
        let ss = truncated.slice(2);
        
        if (ss.length > 0 && parseInt(ss, 10) > 59) {
          ss = "59";
        }
        
        formatted = `${mm}:${ss}`;
      }
      
      setDisplayValue(formatted);
      onChange(formatted);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleChange}
        placeholder="MM:SS"
        className={cn("tabular-nums tracking-wider", className)}
        {...props}
      />
    );
  }
);
TimeInput.displayName = "TimeInput";
