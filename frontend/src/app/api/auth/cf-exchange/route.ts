import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAbsoluteUrl } from "@/lib/request-url";

const BACKEND_URL = process.env.API_URL ?? "http://127.0.0.1:3001/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cfEmail =
    request.headers.get("cf-access-authenticated-user-email") ??
    process.env.CF_DEV_EMAIL ??
    undefined;
  const redirect = request.nextUrl.searchParams.get("redirect") ?? "/dashboard";

  if (!cfEmail) {
    return NextResponse.redirect(getAbsoluteUrl("/", request));
  }

  let resp: Response;
  try {
    resp = await fetch(`${BACKEND_URL}/auth/cf-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cf-email": cfEmail,
      },
      body: JSON.stringify({ email: cfEmail }),
    });
  } catch {
    return new NextResponse("Backend unreachable", { status: 502 });
  }

  if (resp.status === 403) {
    const body = await resp.json().catch(() => ({ email: cfEmail }));
    return new NextResponse(
      `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Geen toegang — S-Base</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 2.5rem; max-width: 420px; text-align: center; }
  h1 { color: #00e3a4; font-size: 1.5rem; margin: 0 0 0.75rem; }
  p { color: #a0a0a0; line-height: 1.6; margin: 0.5rem 0; }
  code { background: #2a2a2a; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.875rem; color: #00e3a4; }
</style>
</head><body>
  <div class="card">
    <h1>Geen account gevonden</h1>
    <p>Je Cloudflare identiteit is geverifieerd als:</p>
    <p><code>${body.email ?? cfEmail}</code></p>
    <p>Maar er bestaat geen S-Base account voor dit e-mailadres.<br>Neem contact op met de beheerder.</p>
  </div>
</body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (!resp.ok) {
    return new NextResponse("Auth exchange failed", { status: 502 });
  }

  const setCookie = resp.headers.get("set-cookie");
  if (!setCookie) {
    return new NextResponse("No session returned from backend", { status: 502 });
  }

  const destination = getAbsoluteUrl(redirect.startsWith("/") ? redirect : "/dashboard", request);
  const response = NextResponse.redirect(destination);
  response.headers.set("Set-Cookie", setCookie);
  return response;
}
