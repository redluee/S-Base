export class ValidationError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class ConflictError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ConflictError";
    this.details = details;
  }
}

export function requireId(value: unknown, label = "Id"): number {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1) throw new ValidationError(`${label} must be a valid id`);
  return n;
}

export function requireText(value: unknown, label: string, maxLength = 200): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${label} is required`);
  if (value.length > maxLength) throw new ValidationError(`${label} is too long`);
  return value;
}

export function optionalText(value: unknown, label: string, maxLength = 5000): string | null | undefined {
  if (value === undefined || value === null) return value as null | undefined;
  if (typeof value !== "string") throw new ValidationError(`${label} must be text`);
  if (value.length > maxLength) throw new ValidationError(`${label} is too long`);
  return value;
}

export function optionalNumber(value: unknown, label: string): number | null | undefined {
  if (value === undefined || value === null) return value as null | undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ValidationError(`${label} must be a number`);
  return value;
}

export function optionalInteger(value: unknown, label: string): number | null | undefined {
  const n = optionalNumber(value, label);
  if (n !== undefined && n !== null && !Number.isInteger(n)) throw new ValidationError(`${label} must be a whole number`);
  return n;
}

export function requireObject(value: unknown, label = "Request body"): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError(`${label} must be an object`);
  return value as Record<string, any>;
}

export function requireDateTime(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(new Date(value).getTime())) {
    throw new ValidationError(`${label} must be a valid date`);
  }
  return value;
}

export function validationResponse(e: unknown): Response | null {
  if (e instanceof ValidationError) {
    return new Response(JSON.stringify({ error: e.message, ...e.details }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (e instanceof ConflictError) {
    return new Response(JSON.stringify({ error: e.message, ...e.details }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
