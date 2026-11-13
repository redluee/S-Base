import http from "node:http";
import type { NextRequest } from "next/server";
import { BACKEND_API_URL, CF_EMAIL_HEADER } from "@/lib/backend";

const UNAVAILABLE = JSON.stringify({ error: "minecraft.proxyUnavailable" });

export async function proxyToBackend(request: NextRequest, path: string): Promise<Response> {
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? null : Buffer.from(await request.arrayBuffer());

  const headers: Record<string, string> = {
    cookie: request.headers.get("cookie") || "",
    [CF_EMAIL_HEADER]: request.headers.get(CF_EMAIL_HEADER) || "",
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  if (body) headers["content-length"] = body.length.toString();

  return new Promise<Response>((resolve) => {
    const req = http.request(`${BACKEND_API_URL}${path}`, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        resolve(
          new Response(Buffer.concat(chunks), {
            status: res.statusCode || 200,
            headers: { "content-type": res.headers["content-type"] || "application/json" },
          }),
        );
      });
    });
    req.on("error", () => {
      resolve(new Response(UNAVAILABLE, { status: 502, headers: { "content-type": "application/json" } }));
    });
    if (body) req.write(body);
    req.end();
  });
}
