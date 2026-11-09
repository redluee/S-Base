export class AppError extends Error {
  readonly status: number;
  readonly key: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, key: string, details: Record<string, unknown> = {}) {
    super(key);
    this.status = status;
    this.key = key;
    this.details = details;
  }

  toBody(): Record<string, unknown> {
    return { ...this.details, error: this.key };
  }
}

export class ValidationError extends AppError {
  constructor(key: string, details: Record<string, unknown> = {}) {
    super(400, key, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(key = "common.notFound", details: Record<string, unknown> = {}) {
    super(404, key, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(key: string, details: Record<string, unknown> = {}) {
    super(409, key, details);
    this.name = "ConflictError";
  }
}

export function errorResponse(error: AppError): Response {
  return new Response(JSON.stringify(error.toBody()), {
    status: error.status,
    headers: { "Content-Type": "application/json" },
  });
}

export function orNotFound<T>(value: T | null | undefined, key = "common.notFound"): T {
  if (value === null || value === undefined) throw new NotFoundError(key);
  return value;
}
