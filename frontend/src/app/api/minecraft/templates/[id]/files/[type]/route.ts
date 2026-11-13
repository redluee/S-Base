import type { NextRequest } from "next/server";
import { proxyToBackend } from "../../../../proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: NextRequest, context: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await context.params;
  return proxyToBackend(request, `/minecraft/templates/${encodeURIComponent(id)}/files/${encodeURIComponent(type)}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
