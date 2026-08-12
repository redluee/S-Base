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
  });
});
