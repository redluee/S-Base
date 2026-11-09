import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft map", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("detects Pl3xMap mod and serves world map static files safely", async () => {
    const srvDir = join(testDir, "test-pl3xmap-server");
    const modsDir = join(srvDir, "mods");
    const webDir = join(srvDir, "config", "pl3xmap", "web");
    const tilesDir = join(webDir, "tiles");

    await mkdir(modsDir, { recursive: true });
    await mkdir(tilesDir, { recursive: true });

    // Mock Pl3xMap jar in mods folder
    await writeFile(join(modsDir, "Pl3xMap-26.2-554.jar"), "dummy jar");
    await writeFile(join(webDir, "index.html"), "<!DOCTYPE html><html><body><div id='map'></div></body></html>");
    await writeFile(join(webDir, "leaflet.css"), "body { margin: 0; }");
    await writeFile(join(tilesDir, "settings.json"), JSON.stringify({ zoom: { snap: 0.25 } }));

    // Mock a gzip compressed file
    const gzipBuf = Bun.gzipSync(Buffer.from(JSON.stringify({ 0: "minecraft:stone" })));
    await writeFile(join(tilesDir, "blocks.gz"), gzipBuf);

    db.insert(mc_servers)
      .values({
        slug: "test-pl3xmap-server",
        displayName: "Pl3xMap Test Server",
        engine: "fabric",
        mcVersion: "26.2",
        serverDir: srvDir,
      })
      .run();

    // Check map status
    const status = await minecraft.map.status("test-pl3xmap-server");
    expect(status.hasMap).toBe(true);
    expect(status.webExists).toBe(true);

    // Check getServerDetail includes hasMap: true
    const detail = minecraft.servers.detail("test-pl3xmap-server");
    expect(detail?.hasMap).toBe(true);

    // Test serving index.html
    const indexRes = await minecraft.map.serve("test-pl3xmap-server", "index.html");
    expect(indexRes.status).toBe(200);
    expect(indexRes.contentType).toBe("text/html; charset=utf-8");
    expect(indexRes.data?.toString()).toContain("<div id='map'>");

    // Test serving css
    const cssRes = await minecraft.map.serve("test-pl3xmap-server", "leaflet.css");
    expect(cssRes.status).toBe(200);
    expect(cssRes.contentType).toBe("text/css; charset=utf-8");

    // Test serving gzip compressed file with Content-Encoding: gzip
    const gzRes = await minecraft.map.serve("test-pl3xmap-server", "tiles/blocks.gz");
    expect(gzRes.status).toBe(200);
    expect(gzRes.contentEncoding).toBe("gzip");
    expect(gzRes.headers?.["Content-Encoding"]).toBe("gzip");

    // Test path traversal protection
    await expect(minecraft.map.serve("test-pl3xmap-server", "../../../etc/passwd")).rejects.toMatchObject({
      key: "minecraft.invalidPath",
      status: 400,
    });
    await expect(minecraft.map.serve("test-pl3xmap-server", "missing.json")).rejects.toMatchObject({
      key: "minecraft.mapNotFound",
      status: 404,
    });

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-pl3xmap-server")).run();
  });
});
