import { app } from "./index";

export function cookieOf(res: Response): string {
  const match = (res.headers.get("set-cookie") ?? "").match(/session_id=([^;]+)/);
  return `session_id=${match?.[1] ?? ""}`;
}

export async function login(username = "admin", password = username): Promise<string> {
  return cookieOf(await call("", "POST", "/api/auth/login", { username, password }));
}

export function call(cookie: string, method: string, path: string, body?: unknown): Promise<Response> {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export function upload(cookie: string, path: string, files: File[], field = "files"): Promise<Response> {
  const form = new FormData();
  for (const file of files) form.append(field, file);
  return app.handle(
    new Request(`http://localhost${path}`, { method: "POST", headers: { Cookie: cookie }, body: form }),
  );
}
