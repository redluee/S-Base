import { isCalendarDate, today } from "../../shared/dates";
import { ValidationError } from "../../utils/errors";
import { requireObject } from "../../utils/validation";

export const MAX_CENTS = 1_000_000_000_000;
export { today };
export function calendarDate(value: unknown, allowFuture = false): string {
  if (!isCalendarDate(value) || value < "1900-01-01") throw new ValidationError("finance.invalidDate");
  if (!allowFuture && value > today()) throw new ValidationError("finance.futureDate");
  return value;
}
export function cents(value: unknown, minimum = -MAX_CENTS): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > MAX_CENTS)
    throw new ValidationError("finance.invalidMoney");
  return value;
}
export function text(value: unknown, optional = false): string | null {
  if (optional && (value == null || value === "")) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120)
    throw new ValidationError("finance.invalidName");
  return value.trim();
}
export function accountInput(input: unknown) {
  const data = requireObject(input);
  if (data.type !== "current" && data.type !== "savings") throw new ValidationError("finance.invalidType");
  return {
    name: text(data.name)!,
    bank: text(data.bank, true),
    type: data.type as "current" | "savings",
    openingDate: calendarDate(data.openingDate),
    openingBalanceCents: cents(data.openingBalanceCents),
  };
}
