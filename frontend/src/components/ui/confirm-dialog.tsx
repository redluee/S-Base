"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "primary" | "destructive";
  busy?: boolean;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = "primary",
  busy = false,
}: ConfirmDialogProps) {
  const titleId = React.useId();
  return (
    <ModalOverlay open={open} onClose={onCancel} label={title} labelledBy={titleId}>
      <div className="bg-popover ring-1 ring-foreground/10 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 text-center">
        <h3 id={titleId} className="font-semibold text-lg text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground break-words">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 sm:min-w-24 text-foreground"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "min-h-11 sm:min-w-24 font-semibold",
              tone === "destructive"
                ? "bg-destructive text-zinc-950 hover:bg-destructive/90"
                : "bg-brand text-zinc-950 hover:bg-brand-hover"
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export { ConfirmDialog };
