import { ValidationError, requireObject } from "../../utils/validation";

export const MAX_CENTS = 1_000_000_000_000;
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function calendarDate(value: unknown, allowFuture = false): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01"
  )
    throw new ValidationError("Invalid calendar date");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new ValidationError("Invalid calendar date");
  if (!allowFuture && value > today())
    throw new ValidationError("Future balances are not allowed");
  return value;
}
export function cents(value: unknown, minimum = -MAX_CENTS): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > MAX_CENTS
  )
    throw new ValidationError("Invalid amount in cents");
  return value;
}
export function text(value: unknown, optional = false): string | null {
  if (optional && (value == null || value === "")) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120)
    throw new ValidationError("Name or bank must contain 1 to 120 characters");
  return value.trim();
}
export function accountInput(input: unknown) {
  const data = requireObject(input);
  if (data.type !== "current" && data.type !== "savings")
    throw new ValidationError("Invalid account type");
  return {
    name: text(data.name)!,
    bank: text(data.bank, true),
    type: data.type as "current" | "savings",
    openingDate: calendarDate(data.openingDate),
    openingBalanceCents: cents(data.openingBalanceCents),
  };
}
export function goalInput(input: unknown) {
  const data = requireObject(input);
  return {
    name: text(data.name)!,
    targetCents: cents(data.targetCents, 1),
    targetDate:
      data.targetDate == null || data.targetDate === ""
        ? null
        : calendarDate(data.targetDate, true),
  };
}
