import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../index";
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

describe("recipe routes error contract", () => {
  let cookie: string;

  beforeEach(async () => {
    await setupTestDb();
    cookie = await login();
  });

  it("maps NotFoundError to 404 with an i18n key", async () => {
    for (const path of ["/api/recipes/999999", "/api/wines/999999"]) {
      const res = await call(cookie, "GET", path);
      expect(res.status).toBe(404);
    }
    expect(await (await call(cookie, "GET", "/api/wines/999999")).json()).toEqual({ error: "recipes.wineNotFound" });
    expect(await (await call(cookie, "DELETE", "/api/recipes/999999")).json()).toEqual({ error: "recipes.notFound" });
  });

  it("maps ValidationError to 400 with an i18n key", async () => {
    const res = await call(cookie, "POST", "/api/wines", { brand: "X", type: "orange", variety: "Y" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "recipes.invalidWineType" });

    const rating = await call(cookie, "PATCH", "/api/recipes/1/rating", { rating: 11 });
    expect(rating.status).toBe(400);
    expect(await rating.json()).toEqual({ error: "recipes.invalidRating" });
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const res = await call(cookie, "POST", "/api/wines", { brand: 5 });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "common.invalidRequest" });

    const badId = await call(cookie, "GET", "/api/recipes/abc");
    expect(badId.status).toBe(400);
  });

  it("keeps the success shapes of create, update and delete", async () => {
    const created = await (await call(cookie, "POST", "/api/wines", {
      brand: "Test", type: "red", variety: "Merlot", vintage: null, rating: null, imageUrl: null,
    })).json();
    expect(created.brand).toBe("Test");
    const updated = await (await call(cookie, "PUT", `/api/wines/${created.wineId}`, { notes: "ok" })).json();
    expect(updated.notes).toBe("ok");
    expect(await (await call(cookie, "DELETE", `/api/wines/${created.wineId}`)).json()).toEqual({ success: true });
  });

  it("checks authentication before validating the body", async () => {
    for (const [method, path] of [["POST", "/api/wines"], ["PATCH", "/api/recipes/abc/rating"]]) {
      const res = await call("", method, path, { brand: 5 });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    }
  });
});
