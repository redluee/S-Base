import { timingSafeEqual } from "crypto";

export const isProduction = () => process.env.NODE_ENV === "production";

export const resolveCorsOrigin = (): boolean | string[] => {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return isProduction() ? [] : true;
};

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Resource-Policy": "same-site",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const getClientIp = (request: Request): string => {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
};

export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private max: number, private windowMs: number, private now: () => number = Date.now) {}

  check(key: string): { allowed: boolean; retryAfter: number } {
    const now = this.now();
    if (this.hits.size > 10000) this.prune(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) return { allowed: true, retryAfter: 0 };
    if (entry.count >= this.max) return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    return { allowed: true, retryAfter: 0 };
  }

  hit(key: string) {
    const now = this.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

export const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);

export const verifyInternalSecret = (provided: string | null): boolean => {
  const expected = process.env.INTERNAL_AUTH_SECRET;
  if (!expected) return !isProduction();
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
