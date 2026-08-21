import type { NextRequest } from "next/server";

export function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ? forwardedHost.split(",")[0].trim() : request.headers.get("host");

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : host && (host.includes("localhost") || host.includes("127.0.0.1"))
      ? "http"
      : "https";

  if (host) {
    return `${proto}://${host}`;
  }

  return request.url;
}

export function getAbsoluteUrl(path: string, request: NextRequest): URL {
  const base = getBaseUrl(request);
  return new URL(path, base);
}
