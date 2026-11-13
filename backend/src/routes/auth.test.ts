import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../db/client";
import { users } from "../db/schema";
import { call, cookieOf, login } from "../test-http";
import { setupTestDb } from "../test-utils";

describe("auth routes", () => {
  let testerId: number;

  beforeEach(async () => {
    ({ testerId } = await setupTestDb());
  });

  it("logs in, answers /me with the session user and logs out", async () => {
    const cookie = await login("admin");
    const me = await call(cookie, "GET", "/api/auth/me");
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { username: string; role: string } }).user).toMatchObject({
      username: "admin",
      role: "admin",
    });

    await call(cookie, "GET", "/api/auth/logout");
    expect((await call(cookie, "GET", "/api/auth/me")).status).toBe(401);
  });

  it("answers failed logins with auth keys", async () => {
    const wrong = await call("", "POST", "/api/auth/login", { username: "admin", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: "auth.wrongPassword" });

    const empty = await call("", "POST", "/api/auth/login", { username: "", password: "" });
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "common.invalidRequest" });

    db.update(users).set({ isPaused: 1 }).where(eq(users.userId, testerId)).run();
    const paused = await call("", "POST", "/api/auth/login", { username: "tester", password: "tester" });
    db.update(users).set({ isPaused: 0 }).where(eq(users.userId, testerId)).run();
    expect(paused.status).toBe(403);
    expect(await paused.json()).toEqual({ error: "auth.accountPaused" });
  });

  it("rejects module routes without a session", async () => {
    const res = await call("", "GET", "/api/recipes");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "common.unauthorized" });
  });

  it("impersonates a user and restores the admin session with a 7-day cookie", async () => {
    const admin = await login("admin");
    const impersonate = await call(admin, "POST", `/api/pulse/users/${testerId}/impersonate`);
    expect(impersonate.status).toBe(200);
    expect(impersonate.headers.get("set-cookie")).toContain(`Max-Age=${7 * 24 * 3600}`);
    const asTester = cookieOf(impersonate);

    const me = (await (await call(asTester, "GET", "/api/auth/me")).json()) as {
      user: { id: number; isImpersonated: boolean; impersonatedBy: string };
    };
    expect(me.user).toMatchObject({ id: testerId, isImpersonated: true, impersonatedBy: "admin" });

    const stop = await call(asTester, "POST", "/api/auth/stop-impersonate");
    expect(((await stop.json()) as { user: { username: string } }).user.username).toBe("admin");
    const restored = (await (await call(cookieOf(stop), "GET", "/api/auth/me")).json()) as {
      user: { username: string; isImpersonated: boolean };
    };
    expect(restored.user).toMatchObject({ username: "admin", isImpersonated: false });
  });
});
