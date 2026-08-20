import { NextRequest } from "next/server";
import http from "node:http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxyHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await context.params;
  const method = request.method;
  const rawBody =
    method === "GET" || method === "HEAD"
      ? null
      : Buffer.from(await request.arrayBuffer());

  return new Promise<Response>((resolve) => {
    const headers: Record<string, string> = {
      cookie: request.headers.get("cookie") || "",
      "cf-access-authenticated-user-email":
        request.headers.get("cf-access-authenticated-user-email") || "",
    };
    if (request.headers.get("content-type")) {
      headers["content-type"] = request.headers.get("content-type") || "";
    }
    if (rawBody) {
      headers["content-length"] = rawBody.length.toString();
    }

    const req = http.request(
      `http://127.0.0.1:3001/api/minecraft/templates/${id}/files/${type}`,
      {
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          resolve(
            new Response(responseBody, {
              status: res.statusCode || 200,
              headers: {
                "content-type":
                  (res.headers["content-type"] as string) || "application/json",
              },
            })
          );
        });
      }
    );

    req.on("error", (err) => {
      resolve(
        new Response(JSON.stringify({ error: err.message }), {
          status: 502,
          headers: { "content-type": "application/json" },
        })
      );
    });

    if (rawBody) {
      req.write(rawBody);
    }
    req.end();
  });
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
