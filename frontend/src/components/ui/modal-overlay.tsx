"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

interface ModalOverlayProps {
  open: boolean
  onClose: () => void
  label: string
  labelledBy?: string
  children: React.ReactNode
  className?: string
  backdropClassName?: string
}

/**
 * Generic full-screen modal overlay with correct dialog semantics
 * (role="dialog", aria-modal, focus trap, Escape-to-close, focus-restore)
 * built on top of @base-ui/react/dialog. Visual styling (backdrop/box) is
 * passed in via className so existing call sites keep their look.
 */
function ModalOverlay({
  open,
  onClose,
  label,
  labelledBy,
  children,
  className,
  backdropClassName,
}: ModalOverlayProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200",
            backdropClassName,
          )}
        />
        {/* Plain centering wrapper (not part of the outside-press hit test) so
            base-ui's Popup bounding box matches the visible content box, and
            clicking the empty padding/backdrop area still dismisses the dialog. */}
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none",
            className,
          )}
        >
          <DialogPrimitive.Popup
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            className="pointer-events-auto outline-none"
          >
            {children}
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { ModalOverlay }
