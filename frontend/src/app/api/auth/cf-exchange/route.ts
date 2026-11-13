import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BACKEND_API_URL, cfEmailOf } from "@/lib/backend";
import { getAbsoluteUrl } from "@/lib/request-url";
import { t } from "@/lib/lang";

export const runtime = "nodejs";

function noAccountPage(email: string) {
  const escaped = email.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return new NextResponse(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>${t("auth.noAccountTitle")} — S-Base</title>
<style>
  body { font-family: system-ui, sans-serif; background: #000; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: oklch(0.205 0 0); border-radius: 12px; padding: 2.5rem; max-width: 420px; text-align: center; }
  h1 { color: #00e3a4; font-size: 1.5rem; margin: 0 0 0.75rem; }
  p { color: #a0a0a0; line-height: 1.6; margin: 0.5rem 0; }
</style>
</head><body>
  <div class="card">
    <h1>${t("auth.noAccountTitle")}</h1>
    <p>${t("auth.noAccount", { email: escaped })}</p>
  </div>
</body></html>`,
    { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const cfEmail = cfEmailOf(request.headers);
  const redirect = request.nextUrl.searchParams.get("redirect") ?? "/dashboard";
  if (!cfEmail) return NextResponse.redirect(getAbsoluteUrl("/", request));

  const resp = await fetch(`${BACKEND_API_URL}/auth/cf-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cf-email": cfEmail,
      "x-internal-auth": process.env.INTERNAL_AUTH_SECRET ?? "",
    },
    body: JSON.stringify({ email: cfEmail }),
  }).catch(() => null);

  if (!resp) return new NextResponse(t("auth.backendUnreachable"), { status: 502 });
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { error?: string };
    if (body.error === "auth.noAccount") return noAccountPage(cfEmail);
    return new NextResponse(t(body.error ?? "auth.exchangeFailed"), { status: 502 });
  }

  const setCookie = resp.headers.get("set-cookie");
  if (!setCookie) return new NextResponse(t("auth.exchangeFailed"), { status: 502 });
  const response = NextResponse.redirect(getAbsoluteUrl(redirect.startsWith("/") ? redirect : "/dashboard", request));
  response.headers.set("Set-Cookie", setCookie);
  return response;
}
