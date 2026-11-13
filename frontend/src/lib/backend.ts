export const BACKEND_API_URL = process.env.API_URL ?? "http://127.0.0.1:3001/api";
export const SESSION_COOKIE = "session_id";
export const CF_EMAIL_HEADER = "cf-access-authenticated-user-email";

export function cfEmailOf(headers: Headers): string | undefined {
  return headers.get(CF_EMAIL_HEADER) ?? process.env.CF_DEV_EMAIL ?? undefined;
}
