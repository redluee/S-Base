import type { NextRequest } from "next/server";
import { proxyToBackend } from "../../../../proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: NextRequest, context: { params: Promise<{ slug: string; type: string }> }) {
  const { slug, type } = await context.params;
  return proxyToBackend(request, `/minecraft/servers/${encodeURIComponent(slug)}/files/${encodeURIComponent(type)}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
