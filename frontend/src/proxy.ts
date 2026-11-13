import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cfEmailOf, SESSION_COOKIE } from "@/lib/backend";
import { PROTECTED_PATH_PREFIXES } from "@/lib/modules";
import { getAbsoluteUrl } from "@/lib/request-url";

function isProtected(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function cfExchange(request: NextRequest, redirect: string) {
  const url = getAbsoluteUrl("/api/auth/cf-exchange", request);
  url.searchParams.set("redirect", redirect);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  const cfEmail = cfEmailOf(request.headers);

  if (pathname === "/") return cfEmail && !hasSession ? cfExchange(request, "/dashboard") : NextResponse.next();
  if (!isProtected(pathname) || hasSession) return NextResponse.next();
  if (cfEmail) return cfExchange(request, pathname);
  return NextResponse.redirect(getAbsoluteUrl("/", request));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.[a-z0-9]+$).*)"],
};
