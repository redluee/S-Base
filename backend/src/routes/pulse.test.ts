import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../index";
import { pulse } from "../context";
import { setupTestDb } from "../test-utils";

async function login() {
  const res = await app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    }),
  );
  const match = (res.headers.get("set-cookie") ?? "").match(/session_id=([^;]+)/);
  return `session_id=${match?.[1] ?? ""}`;
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

describe("pulse routes error contract", () => {
  let cookie: string;
  let testerId: number;

  beforeEach(async () => {
    testerId = (await setupTestDb()).testerId;
    cookie = await login();
  });

  it("maps ValidationError to 400 with an i18n key", async () => {
    const res = await call(cookie, "POST", "/api/pulse/users", { username: "u", email: "bad", password: "longenough" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "pulse.emailInvalid" });

    const time = await call(cookie, "POST", "/api/pulse/shutdown-schedule", { time: "99:99" });
    expect(time.status).toBe(400);
    expect(await time.json()).toEqual({ error: "pulse.invalidTime" });
  });

  it("maps schema failures to common.invalidRequest", async () => {
    const missing = await call(cookie, "POST", "/api/pulse/users", { username: "u" });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "common.invalidRequest" });

    const badId = await call(cookie, "PUT", "/api/pulse/users/abc/email", { email: null });
    expect(badId.status).toBe(400);
    expect(await badId.json()).toEqual({ error: "common.invalidRequest" });

    const badModules = await call(cookie, "PUT", `/api/pulse/users/${testerId}/modules`, { modules: "recipes" });
    expect(badModules.status).toBe(400);
  });

  it("maps ConflictError to 409 and creates users with 201", async () => {
    const created = await call(cookie, "POST", "/api/pulse/users", {
      username: "route-user",
      email: "route@example.com",
      password: "longenough",
    });
    expect(created.status).toBe(201);
    expect(((await created.json()) as { username: string }).username).toBe("route-user");

    const dupe = await call(cookie, "POST", "/api/pulse/users", {
      username: "route-user",
      email: "other@example.com",
      password: "longenough",
    });
    expect(dupe.status).toBe(409);
    expect(await dupe.json()).toEqual({ error: "pulse.usernameExists" });
  });

  it("maps NotFoundError to 404 with an i18n key", async () => {
    const calls: [string, string, unknown][] = [
      ["PUT", "/api/pulse/users/999999/email", { email: "x@example.com" }],
      ["PUT", "/api/pulse/users/999999/status", { isPaused: true }],
      ["PUT", "/api/pulse/users/999999/modules", { modules: [] }],
      ["PUT", "/api/pulse/users/999999/servers", { servers: [] }],
      ["POST", "/api/pulse/users/999999/impersonate", undefined],
    ];
    for (const [method, path, body] of calls) {
      const res = await call(cookie, method, path, body);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "pulse.userNotFound" });
    }
  });

  it("rejects impersonating a paused user with a validation key", async () => {
    await call(cookie, "PUT", `/api/pulse/users/${testerId}/status`, { isPaused: true });
    try {
      const res = await call(cookie, "POST", `/api/pulse/users/${testerId}/impersonate`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "pulse.userPaused" });
    } finally {
      await call(cookie, "PUT", `/api/pulse/users/${testerId}/status`, { isPaused: false });
    }
  });

  it("answers 409 while a system update is running", async () => {
    const run = pulse.systemUpdate as unknown as { state: { status: string } };
    const original = run.state.status;
    run.state.status = "running";
    try {
      const start = await call(cookie, "POST", "/api/pulse/system-update");
      expect(start.status).toBe(409);
      expect(await start.json()).toEqual({ error: "pulse.updateAlreadyRunning" });

      const reboot = await call(cookie, "POST", "/api/pulse/reboot");
      expect(reboot.status).toBe(409);
      expect(await reboot.json()).toEqual({ error: "pulse.updateRunning" });
    } finally {
      run.state.status = original;
    }
  });

  it("keeps auth responses unchanged", async () => {
    const res = await app.handle(new Request("http://localhost/api/pulse/users"));
    expect(res.status).toBe(401);
  });
});
