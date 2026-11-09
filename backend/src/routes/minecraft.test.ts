import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { requireFullMinecraftAccess } from "../context";
import db from "../db/client";
import { mc_servers, mc_templates } from "../db/schema/minecraft";
import { app } from "../index";
import { BASE_DIR } from "../modules/minecraft/paths";
import { setupTestDb } from "../test-utils";

const SLUG = "route-errors-srv";

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
    new Request(`http://localhost/api/minecraft${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

function upload(cookie: string, path: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  return app.handle(new Request(`http://localhost/api/minecraft${path}`, { method: "POST", headers: { Cookie: cookie }, body: form }));
}

describe("minecraft routes error contract", () => {
  let cookie: string;
  const serverDir = join(BASE_DIR, SLUG);

  beforeEach(async () => {
    await setupTestDb();
    cookie = await login();
    await mkdir(serverDir, { recursive: true });
    db.insert(mc_servers).values({ slug: SLUG, displayName: "Route Errors", engine: "vanilla", mcVersion: "1.21.1", serverDir }).run();
  });

  afterEach(async () => {
    db.delete(mc_servers).where(eq(mc_servers.slug, SLUG)).run();
    await rm(serverDir, { recursive: true, force: true });
  });

  it("maps missing servers to 404 with an i18n key", async () => {
    for (const [method, path] of [
      ["GET", "/servers/no-such-srv"],
      ["GET", "/servers/no-such-srv/status"],
      ["GET", "/servers/no-such-srv/players"],
      ["GET", "/servers/no-such-srv/error"],
      ["GET", "/servers/no-such-srv/map/status"],
      ["GET", "/servers/no-such-srv/map"],
      ["GET", "/servers/no-such-srv/properties"],
      ["DELETE", "/servers/no-such-srv"],
    ]) {
      const res = await call(cookie, method, path);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "minecraft.serverNotFound" });
    }
  });

  it("answers a map request without a map with minecraft.mapNotFound", async () => {
    const res = await call(cookie, "GET", `/servers/${SLUG}/map/index.html`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "minecraft.mapNotFound" });
  });

  it("serves map files through the wildcard route and rejects traversal", async () => {
    await mkdir(join(serverDir, "web", "tiles"), { recursive: true });
    await Bun.write(join(serverDir, "web", "index.html"), "<html><head></head><body>map</body></html>");
    await Bun.write(join(serverDir, "web", "tiles", "a.json"), "{}");

    const index = await call(cookie, "GET", `/servers/${SLUG}/map`);
    expect(index.status).toBe(200);
    expect(await index.text()).toContain(`<base href="/api/minecraft/servers/${SLUG}/map/">`);
    const nested = await call(cookie, "GET", `/servers/${SLUG}/map/tiles/a.json`);
    expect(nested.status).toBe(200);
    expect(nested.headers.get("content-type")).toContain("application/json");
    const missing = await call(cookie, "GET", `/servers/${SLUG}/map/tiles/none.json`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "minecraft.mapNotFound" });
    const status = await call(cookie, "GET", `/servers/${SLUG}/map/status`);
    expect(await status.json()).toEqual({ hasMap: true, webExists: true });
  });

  it("keeps the success shape of server detail", async () => {
    const res = await call(cookie, "GET", `/servers/${SLUG}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string; onlinePlayers: unknown[]; template: unknown; hasMap: boolean };
    expect(body.slug).toBe(SLUG);
    expect(body.onlinePlayers).toEqual([]);
    expect(body.template).toBeNull();
    expect(body.hasMap).toBe(false);
  });

  it("maps invalid server input to 400 keys and duplicates to 409", async () => {
    const base = { slug: "route-new-srv", displayName: "New", engine: "vanilla", mcVersion: "1.21.1" };
    const cases: [object, string][] = [
      [{ ...base, slug: "BAD SLUG" }, "minecraft.invalidSlug"],
      [{ ...base, engine: "forge" }, "minecraft.unsupportedEngine"],
      [{ ...base, displayName: "   " }, "minecraft.displayNameRequired"],
      [{ ...base, mcVersion: " " }, "minecraft.versionRequired"],
    ];
    for (const [body, key] of cases) {
      const res = await call(cookie, "POST", "/servers", body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: key });
    }

    const dup = await call(cookie, "POST", "/servers", { ...base, slug: SLUG });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: "minecraft.slugExists" });

    const patch = await call(cookie, "PATCH", `/servers/${SLUG}`, { displayName: " " });
    expect(patch.status).toBe(400);
    expect(await patch.json()).toEqual({ error: "minecraft.displayNameRequired" });
    const engine = await call(cookie, "PATCH", `/servers/${SLUG}`, { engine: "forge" });
    expect(await engine.json()).toEqual({ error: "minecraft.unsupportedEngine" });
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases: [string, string, unknown][] = [
      ["POST", "/servers", {}],
      ["POST", "/servers", { slug: 5, displayName: "x", engine: "vanilla", mcVersion: "1" }],
      ["POST", "/import", { slug: "abc" }],
      ["POST", "/import/inspect", {}],
      ["POST", `/servers/${SLUG}/console`, {}],
      ["PATCH", `/servers/${SLUG}/properties`, { gamemode: 1 }],
      ["POST", `/servers/${SLUG}/players/abc/kick`, { reason: 5 }],
      ["POST", "/templates", { engine: "vanilla" }],
      ["POST", `/servers/${SLUG}/files/mods/copy`, { sourceSlug: SLUG }],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "common.invalidRequest" });
    }
    expect((await call(cookie, "GET", `/servers/${SLUG}/console?lines=abc`)).status).toBe(400);
    expect((await call(cookie, "GET", "/templates/abc")).status).toBe(400);
  });

  it("validates folder types, filenames, properties and console commands", async () => {
    const bad = await call(cookie, "GET", `/servers/${SLUG}/files/logs`);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "minecraft.invalidFolderType" });

    const name = await call(cookie, "DELETE", `/servers/${SLUG}/files/mods/evil.exe`);
    expect(await name.json()).toEqual({ error: "minecraft.invalidFileExtension" });
    const slash = await call(cookie, "DELETE", `/servers/${SLUG}/files/mods/${encodeURIComponent("../x.jar")}`);
    expect(await slash.json()).toEqual({ error: "minecraft.invalidFilename" });

    const value = await call(cookie, "PATCH", `/servers/${SLUG}/properties`, { motd: "hi\nop-permission-level=4" });
    expect(value.status).toBe(400);
    expect(await value.json()).toEqual({ error: "minecraft.invalidProperty", property: "motd" });
    const key = await call(cookie, "PATCH", `/servers/${SLUG}/properties`, { "a=b": "x" });
    expect(await key.json()).toEqual({ error: "minecraft.invalidProperty", property: "a=b" });

    const cmd = await call(cookie, "POST", `/servers/${SLUG}/console`, { command: ";`" });
    expect(cmd.status).toBe(400);
    expect(await cmd.json()).toEqual({ error: "minecraft.commandRequired" });
  });

  it("validates uploads with shared upload keys", async () => {
    const empty = await call(cookie, "POST", `/servers/${SLUG}/files/mods`, {});
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "upload.noFile" });

    const wrong = await upload(cookie, `/servers/${SLUG}/files/mods`, [new File(["x"], "notes.txt")]);
    expect(wrong.status).toBe(400);
    expect(((await wrong.json()) as { error: string }).error).toBe("upload.typeNotAllowed");

    const ok = await upload(cookie, `/servers/${SLUG}/files/mods`, [new File(["single"], "single.jar")]);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, count: 1 });
    expect(await readFile(join(serverDir, "mods", "single.jar"), "utf8")).toBe("single");

    const missing = await call(cookie, "POST", `/servers/${SLUG}/files/mods/copy`, { sourceSlug: SLUG, filename: "gone.jar" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "minecraft.fileNotFound" });
    const noSource = await call(cookie, "POST", `/servers/${SLUG}/files/mods/copy`, { sourceSlug: "no-such-srv", filename: "a.jar" });
    expect(await noSource.json()).toEqual({ error: "minecraft.serverNotFound" });
  });

  it("maps template errors to 404, 400 and 409 keys", async () => {
    for (const [method, path] of [
      ["GET", "/templates/999999"],
      ["DELETE", "/templates/999999"],
      ["GET", "/templates/999999/files/mods"],
      ["DELETE", "/templates/999999/files/mods/a.jar"],
    ]) {
      const res = await call(cookie, method, path);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "minecraft.templateNotFound" });
    }
    const speedrun = await call(cookie, "POST", "/templates/999999/speedrun", { slug: "route-speedrun", displayName: "S" });
    expect(await speedrun.json()).toEqual({ error: "minecraft.templateNotFound" });

    const noName = await call(cookie, "POST", "/templates", { name: " ", engine: "vanilla", mcVersion: "1.21.1" });
    expect(noName.status).toBe(400);
    expect(await noName.json()).toEqual({ error: "minecraft.templateNameRequired" });
    const noVersion = await call(cookie, "POST", "/templates", { name: "Route Tmpl", engine: "vanilla" });
    expect(await noVersion.json()).toEqual({ error: "minecraft.versionRequired" });
    const engine = await call(cookie, "POST", "/templates", { name: "Route Tmpl", engine: "forge", mcVersion: "1.21.1" });
    expect(await engine.json()).toEqual({ error: "minecraft.unsupportedEngine" });

    const created = await call(cookie, "POST", "/templates", { name: "Route Tmpl", engine: "vanilla", mcVersion: "1.21.1" });
    expect(created.status).toBe(200);
    const template = (await created.json()) as { templateId: number };
    try {
      const dup = await call(cookie, "POST", "/templates", { name: "Route Tmpl", engine: "vanilla", mcVersion: "1.21.1" });
      expect(dup.status).toBe(409);
      expect(await dup.json()).toEqual({ error: "minecraft.templateNameExists" });

      const type = await call(cookie, "GET", `/templates/${template.templateId}/files/logs`);
      expect(await type.json()).toEqual({ error: "minecraft.invalidFolderType" });
      const up = await upload(cookie, `/templates/${template.templateId}/files/mods`, [new File(["x"], "tmpl.jar")]);
      expect(await up.json()).toEqual({ ok: true, count: 1 });
    } finally {
      expect(await (await call(cookie, "DELETE", `/templates/${template.templateId}`)).json()).toEqual({ ok: true });
    }
    expect(db.select().from(mc_templates).where(eq(mc_templates.name, "Route Tmpl")).get()).toBeUndefined();
  });

  it("maps import failures to 400 and 409 keys", async () => {
    const base = { slug: "route-import", displayName: "Imp", engine: "vanilla", mcVersion: "1.21.1", serverDir };
    const missing = await call(cookie, "POST", "/import", { ...base, serverDir: join(serverDir, "nope") });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "minecraft.directoryNotFound" });
    const dup = await call(cookie, "POST", "/import", { ...base, slug: SLUG });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: "minecraft.slugExists" });
    const engine = await call(cookie, "POST", "/import", { ...base, engine: "forge" });
    expect(await engine.json()).toEqual({ error: "minecraft.unsupportedEngine" });

    const inspect = (await (await call(cookie, "POST", "/import/inspect", { serverDir: join(serverDir, "nope") })).json()) as { isValid: boolean; error: string };
    expect(inspect.isValid).toBe(false);
    expect(inspect.error).toBe("minecraft.directoryNotFound");
  });

  it("answers forbidden access with i18n keys", async () => {
    const res = requireFullMinecraftAccess({ userId: 999999 });
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "minecraft.fullAccessRequired" });
  });
});
