import { ValidationError } from "./errors";

export function requireId(value: unknown, key = "common.invalidRequest"): number {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1) throw new ValidationError(key);
  return n;
}

export function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError("common.invalidRequest");
  return value as Record<string, unknown>;
}
