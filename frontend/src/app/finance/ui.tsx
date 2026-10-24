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
  ...props
}: ComponentProps<typeof Button>) {
  return <Button className={`min-h-11 min-w-11 ${className}`} {...props} />;
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
const errorKeys: Record<string, string> = {
  "Invalid account icon": "finance.invalidIcon",
  "Invalid amount in cents": "finance.invalidMoney",
  "Invalid calendar date": "finance.invalidDate",
  "Future balances are not allowed": "finance.futureDate",
  "Name or bank must contain 1 to 120 characters": "finance.invalidName",
  "Invalid account type": "finance.invalidType",
  "Balance precedes account opening date": "finance.beforeOpening",
  "Balance changed; reload and explicitly edit the existing observation":
    "finance.staleBalance",
  "Opening date conflicts with history": "finance.openingConflict",
  "Release allocations before changing account type": "finance.releaseFirst",
  "Allocation exceeds available savings or account is archived":
    "finance.allocationLimit",
  "Allocation exceeds goal target": "finance.goalLimit",
  "Target is below allocated amount": "finance.targetLimit",
  "Choose at least one balance": "finance.chooseBalance",
  "Only savings accounts can be allocated": "finance.onlySavings",
  "Account limit reached": "finance.accountLimit",
  "Goal limit reached": "finance.goalCountLimit",
};
export function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 403)
    return t("finance.forbidden");
  if (error instanceof ApiError && error.status === 401)
    return t("finance.sessionExpired");
  if (error instanceof ApiError && error.status === 404)
    return t("finance.notFound");
  const message = error instanceof Error ? error.message : "";
  return t(
    errorKeys[message] ??
      (message.startsWith("finance.") ? message : "finance.failed"),
  );
}
