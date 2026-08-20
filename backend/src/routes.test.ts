import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "./test-utils";
import { app } from "./index";

describe("Elysia API Routes", () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  it("handles authentication login and session verification", async () => {
    // 1. Invalid login
    const badLoginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrongpassword" }),
    });
    const badRes = await app.handle(badLoginReq);
    expect(badRes.status).toBe(401);

    // 2. Successful login
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    });
    const loginRes = await app.handle(loginReq);
    expect(loginRes.status).toBe(200);

    const cookieHeader = loginRes.headers.get("set-cookie");
    expect(cookieHeader).toContain("session_id=");

    // Extract cookie value
    const match = cookieHeader?.match(/session_id=([^;]+)/);
    const sessionId = match ? match[1] : "";
    expect(sessionId).not.toBe("");

    // 3. GET /api/auth/me with session cookie
    const meReq = new Request("http://localhost/api/auth/me", {
      headers: { Cookie: `session_id=${sessionId}` },
    });
    const meRes = await app.handle(meReq);
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.username).toBe("admin");
  });

  it("rejects unauthorized module access without valid session cookie", async () => {
    const unauthReq = new Request("http://localhost/api/recipes");
    const unauthRes = await app.handle(unauthReq);
    expect(unauthRes.status).toBe(401);
  });

  it("serves authenticated API requests", async () => {
    // Login to get session
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    });
    const loginRes = await app.handle(loginReq);
    const cookieHeader = loginRes.headers.get("set-cookie") || "";
    const match = cookieHeader.match(/session_id=([^;]+)/);
    const cookie = `session_id=${match ? match[1] : ""}`;

    // Test /api/recipes
    const recipesRes = await app.handle(new Request("http://localhost/api/recipes", { headers: { Cookie: cookie } }));
    expect(recipesRes.status).toBe(200);

    // Test /api/wines
    const winesRes = await app.handle(new Request("http://localhost/api/wines", { headers: { Cookie: cookie } }));
    expect(winesRes.status).toBe(200);

    // Test /api/workouts/templates
    const workoutRes = await app.handle(new Request("http://localhost/api/workouts/templates", { headers: { Cookie: cookie } }));
    expect(workoutRes.status).toBe(200);

    // Test /api/cashflow/clients
    const cashflowRes = await app.handle(new Request("http://localhost/api/cashflow/clients", { headers: { Cookie: cookie } }));
    expect(cashflowRes.status).toBe(200);

    // Test /api/pulse/users
    const pulseRes = await app.handle(new Request("http://localhost/api/pulse/users", { headers: { Cookie: cookie } }));
    expect(pulseRes.status).toBe(200);

    // Test multiple file upload for minecraft server files
    const srvDir = "/tmp/sbase-test-srv-" + Date.now();
    const { mkdir, rm } = await import("fs/promises");
    const { join } = await import("path");
    await mkdir(join(srvDir, "mods"), { recursive: true });
    const { default: db } = await import("./db/client");
    const { mc_servers } = await import("./db/schema");
    db.insert(mc_servers).values({
      slug: "route-test-srv",
      displayName: "Route Test Server",
      engine: "fabric",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    const formData = new FormData();
    formData.append("files", new File([new TextEncoder().encode("mod-a")], "mod-a.jar"));
    formData.append("files", new File([new TextEncoder().encode("mod-b")], "mod-b.jar"));

    const uploadRes = await app.handle(new Request("http://localhost/api/minecraft/servers/route-test-srv/files/mods", {
      method: "POST",
      headers: { Cookie: cookie },
      body: formData,
    }));
    expect(uploadRes.status).toBe(200);
    const uploadJson = await uploadRes.json();
    expect(uploadJson.ok).toBe(true);
    expect(uploadJson.count).toBe(2);

    const listRes = await app.handle(new Request("http://localhost/api/minecraft/servers/route-test-srv/files/mods", {
      headers: { Cookie: cookie },
    }));
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.length).toBe(2);

    await rm(srvDir, { recursive: true, force: true });

    // Test Impersonation Route
    const { setupTestDb } = await import("./test-utils");
    const { testerId } = await setupTestDb();

    const impReq = new Request(`http://localhost/api/pulse/users/${testerId}/impersonate`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    const impRes = await app.handle(impReq);
    expect(impRes.status).toBe(200);
    const impJson = await impRes.json();
    expect(impJson.ok).toBe(true);
    expect(impJson.user.id).toBe(testerId);
    expect(impJson.user.isImpersonated).toBe(true);

    const impCookieHeader = impRes.headers.get("set-cookie") || "";
    const impMatch = impCookieHeader.match(/session_id=([^;]+)/);
    const impCookie = `session_id=${impMatch ? impMatch[1] : ""}`;

    // Verify /api/auth/me returns impersonated state
    const meRes = await app.handle(new Request("http://localhost/api/auth/me", { headers: { Cookie: impCookie } }));
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user.id).toBe(testerId);
    expect(meJson.user.isImpersonated).toBe(true);
    expect(meJson.user.impersonatedBy).toBe("admin");

    // Stop Impersonation
    const stopReq = new Request("http://localhost/api/auth/stop-impersonate", {
      method: "POST",
      headers: { Cookie: impCookie },
    });
    const stopRes = await app.handle(stopReq);
    expect(stopRes.status).toBe(200);
    const stopJson = await stopRes.json();
    expect(stopJson.ok).toBe(true);
    expect(stopJson.user.username).toBe("admin");

    const adminCookieHeader = stopRes.headers.get("set-cookie") || "";
    const adminMatch = adminCookieHeader.match(/session_id=([^;]+)/);
    const restoredAdminCookie = `session_id=${adminMatch ? adminMatch[1] : ""}`;

    const finalMeRes = await app.handle(new Request("http://localhost/api/auth/me", { headers: { Cookie: restoredAdminCookie } }));
    const finalMeJson = await finalMeRes.json();
    expect(finalMeJson.user.username).toBe("admin");
    expect(finalMeJson.user.isImpersonated).toBe(false);
  });
});
