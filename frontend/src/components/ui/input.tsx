"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, onClick, onDoubleClick, onFocus, ...props }: React.ComponentProps<"input">) {
  const caret = React.useRef(0)
  const supportsSelection = !type || ["text", "search", "tel", "url", "password"].includes(type)

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base leading-none transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      onFocus={(event) => {
        onFocus?.(event)
        if (!event.defaultPrevented && supportsSelection && event.currentTarget.matches(":focus-visible")) {
          event.currentTarget.select()
        }
      }}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !supportsSelection || event.detail !== 1) return
        const input = event.currentTarget
        caret.current = input.selectionStart ?? input.value.length
        if (input.selectionStart === input.selectionEnd) input.select()
      }}
      onDoubleClick={(event) => {
        onDoubleClick?.(event)
        if (event.defaultPrevented || !supportsSelection) return
        event.currentTarget.setSelectionRange(caret.current, caret.current)
      }}
    />
  )
}

export { Input }
