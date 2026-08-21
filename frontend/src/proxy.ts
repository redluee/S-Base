import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAbsoluteUrl } from "@/lib/request-url";

const protectedPaths = ["/dashboard", "/recipes", "/workouts", "/cashflow", "/games", "/pulse"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionId = request.cookies.get("session_id")?.value;
  const cfEmail =
    request.headers.get("cf-access-authenticated-user-email") ??
    process.env.CF_DEV_EMAIL ??
    undefined;

  // If user arrives at root '/'
  if (pathname === "/") {
    if (cfEmail && !sessionId) {
      const exchangeUrl = getAbsoluteUrl("/api/auth/cf-exchange", request);
      exchangeUrl.searchParams.set("redirect", "/dashboard");
      return NextResponse.redirect(exchangeUrl);
    }
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  if (sessionId) {
    return NextResponse.next();
  }

  if (cfEmail) {
    const exchangeUrl = getAbsoluteUrl("/api/auth/cf-exchange", request);
    exchangeUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(exchangeUrl);
  }

  return NextResponse.redirect(getAbsoluteUrl("/", request));
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/recipes/:path*",
    "/workouts/:path*",
    "/cashflow/:path*",
    "/games/:path*",
    "/pulse/:path*",
  ],
};
