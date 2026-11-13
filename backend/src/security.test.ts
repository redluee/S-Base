import { beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { RateLimiter, verifyInternalSecret, getClientIp } from "./security";
import { createBackup } from "./db/backup";
import { app } from "./index";
import { setupTestDb } from "./test-utils";

describe("RateLimiter", () => {
  test("blocks after max hits and recovers after window", () => {
    let now = 0;
    const rl = new RateLimiter(2, 1000, () => now);
    rl.hit("k");
    rl.hit("k");
    expect(rl.check("k").allowed).toBe(false);
    now = 1001;
    expect(rl.check("k").allowed).toBe(true);
  });

  test("reset clears a key", () => {
    const rl = new RateLimiter(1, 1000);
    rl.hit("k");
    rl.reset("k");
    expect(rl.check("k").allowed).toBe(true);
  });
});

describe("verifyInternalSecret", () => {
  const withEnv = (env: Record<string, string | undefined>, run: () => void) => {
    const previous = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
    Object.assign(process.env, env);
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
    try {
      run();
    } finally {
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  test("requires matching secret when configured", () => {
    withEnv({ INTERNAL_AUTH_SECRET: "s3cret" }, () => {
      expect(verifyInternalSecret("s3cret")).toBe(true);
      expect(verifyInternalSecret("wrong!")).toBe(false);
      expect(verifyInternalSecret(null)).toBe(false);
    });
  });

  test("refuses every request in production when no secret is configured", () => {
    withEnv({ NODE_ENV: "production", INTERNAL_AUTH_SECRET: undefined }, () => {
      expect(verifyInternalSecret(null)).toBe(false);
      expect(verifyInternalSecret("anything")).toBe(false);
    });
  });

  test("allows requests outside production when no secret is configured", () => {
    withEnv({ NODE_ENV: "development", INTERNAL_AUTH_SECRET: undefined }, () => {
      expect(verifyInternalSecret(null)).toBe(true);
    });
  });
});

test("getClientIp prefers cf-connecting-ip", () => {
  const req = new Request("http://x", { headers: { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" } });
  expect(getClientIp(req)).toBe("1.2.3.4");
});

test("createBackup writes a copy and prunes old ones", () => {
  const dir = mkdtempSync(join(tmpdir(), "sbase-bk-"));
  const sqlite = new Database(":memory:");
  sqlite.run("CREATE TABLE t (a INTEGER)");
  createBackup(sqlite, dir, 1);
  Bun.sleepSync(5);
  createBackup(sqlite, dir, 1);
  expect(readdirSync(dir).length).toBe(1);
});

describe("http hardening", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  test("health endpoint and security headers", async () => {
    const res = await app.handle(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("login is rate limited after repeated failures", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "cf-connecting-ip": "9.9.9.9" },
          body: JSON.stringify({ username: "nobody", password: "bad" }),
        }),
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
