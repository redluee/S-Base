import { isProduction } from "../security";

export const SESSION_COOKIE = "session_id";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

interface CookieJar {
  value?: unknown;
  set: (config: {
    value: string;
    httpOnly?: boolean;
    sameSite?: "lax";
    path: string;
    maxAge: number;
    secure: boolean;
  }) => unknown;
}

export function readSessionId(cookie: CookieJar | undefined, request: Request): string {
  if (typeof cookie?.value === "string" && cookie.value) return cookie.value;
  const match = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : "";
}

export function writeSessionCookie(cookie: CookieJar | undefined, sessionId: string): void {
  cookie?.set({
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: isProduction(),
  });
}

export function clearSessionCookie(cookie: CookieJar | undefined): void {
  cookie?.set({ value: "", path: "/", maxAge: 0, secure: isProduction() });
}
