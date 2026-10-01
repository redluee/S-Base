import * as React from "react";
import { cn } from "@/lib/utils";

function InlineAlert({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg bg-destructive/10 ring-1 ring-destructive/20 px-3 py-2 text-sm text-destructive break-words",
        className
      )}
    >
      {children}
    </p>
  );
}

export { InlineAlert };
