import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/recipes", "/workouts"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionId = request.cookies.get("session_id")?.value;
  const cfEmail =
    request.headers.get("cf-access-authenticated-user-email") ??
    (process.env.NODE_ENV === "development" ? process.env.CF_DEV_EMAIL : undefined);

  // If user arrives at root '/'
  if (pathname === "/") {
    if (cfEmail && !sessionId) {
      const exchangeUrl = new URL("/api/auth/cf-exchange", request.url);
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
    const exchangeUrl = new URL("/api/auth/cf-exchange", request.url);
    exchangeUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(exchangeUrl);
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/recipes/:path*", "/workouts/:path*"],
};
