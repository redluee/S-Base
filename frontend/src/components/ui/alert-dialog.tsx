import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"

function AlertDialogRoot(props: AlertDialogPrimitive.Root.Props) {
  return (
    <AlertDialogPrimitive.Root {...props} />
  )
}

function AlertDialogTrigger({
  className,
  ...props
}: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger className={className} {...props} />
  )
}

function AlertDialogPortal({
  className,
  ...props
}: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal className={className} {...props} />
  )
}

function AlertDialogBackdrop({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogPopup({
  className,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <AlertDialogPrimitive.Popup
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm",
          "rounded-xl bg-zinc-900 p-6 ring-1 ring-foreground/10 shadow-2xl",
          "origin-center",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-base font-semibold text-foreground mb-1", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-muted-foreground mb-6", className)}
      {...props}
    />
  )
}

function AlertDialogActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogClose({
  className,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close className={className} {...props} />
  )
}

export {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogActions,
  AlertDialogClose,
}
