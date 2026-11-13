import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const visit = (path: string, init: { cookie?: string; cfEmail?: string } = {}) => {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.cfEmail) headers.set("cf-access-authenticated-user-email", init.cfEmail);
  return proxy(new NextRequest(`http://localhost:3000${path}`, { headers }));
};

describe("proxy", () => {
  it("sends anonymous visitors of every internal module back to the login page", () => {
    for (const path of ["/dashboard", "/workouts/history", "/minor/sprints", "/resume", "/games/minecraft", "/pulse"]) {
      expect(new URL(visit(path).headers.get("location")!).pathname).toBe("/");
    }
  });

  it("starts the Cloudflare exchange for anonymous visitors with a Cloudflare identity", () => {
    const location = new URL(visit("/minor", { cfEmail: "someone@example.com" }).headers.get("location")!);
    expect(location.pathname).toBe("/api/auth/cf-exchange");
    expect(location.searchParams.get("redirect")).toBe("/minor");
  });

  it("lets requests with a session and public pages through", () => {
    expect(visit("/minor", { cookie: "session_id=abc" }).headers.get("location")).toBeNull();
    expect(visit("/").headers.get("location")).toBeNull();
    expect(visit("/minority-report").headers.get("location")).toBeNull();
  });
});
