"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    // Internal state if not controlled
    const [internalChecked, setInternalChecked] = React.useState(!!props.defaultChecked);
    
    const isChecked = checked !== undefined ? checked : internalChecked;

    const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
      // Prevent default to avoid triggering form submits or label clicks twice if not handled well
      e.stopPropagation();
      const newChecked = !isChecked;
      if (checked === undefined) {
        setInternalChecked(newChecked);
      }
      onCheckedChange?.(newChecked);
    };

    return (
      <div 
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-brand" : "bg-white/10",
          className
        )}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(e);
          }
        }}
        role="switch"
        aria-checked={isChecked}
        tabIndex={0}
      >
        <input 
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={(e) => {
             // Handle native change if somehow triggered
             if (checked === undefined) setInternalChecked(e.target.checked);
             onCheckedChange?.(e.target.checked);
          }}
          ref={ref}
          {...props} 
        />
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </div>
    );
  }
);
Switch.displayName = "Switch";
