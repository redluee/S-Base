import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/lang";
import { ApiError } from "@/lib/api/core";

export const panel = "rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6";
export const selectClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand";
export function Action({
  className = "",
  variant = "default",
  ...props
}: ComponentProps<typeof Button>) {
  const highlightClass = variant === "ghost" || variant === "outline"
    ? "hover:bg-accent aria-expanded:bg-accent dark:hover:bg-accent"
    : "";
  return <Button variant={variant} className={`min-h-11 min-w-11 ${highlightClass} ${className}`} {...props} />;
}
export function Field({
  label,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground">
      {label}
      <Input className="min-h-11 text-foreground" {...props} />
    </label>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-lg border p-3 text-sm leading-relaxed ${error ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"}`}
    >
      {children}
    </p>
  );
}
export function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 403)
    return t("finance.forbidden");
  if (error instanceof ApiError && error.status === 401)
    return t("finance.sessionExpired");
  if (error instanceof ApiError) {
    if (error.key.startsWith("finance.") || error.key === "common.invalidRequest") return error.message;
    if (error.status === 404) return t("finance.notFound");
    return t("finance.failed");
  }
  const message = error instanceof Error ? error.message : "";
  return t(message.startsWith("finance.") ? message : "finance.failed");
}
