import { afterEach, beforeEach, describe, expect, it, type Mock } from "bun:test";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft servers and downloads", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("lists available versions as string array", async () => {
    expect(await minecraft.downloads.listVersions()).toEqual(["1.21.1", "1.21"]);
    expect(await minecraft.downloads.listVersions()).toEqual(["1.21.1", "1.21"]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
  }, 15000);
  it("reports a failed upstream download as a 502", async () => {
    (globalThis.fetch as unknown as Mock<() => Promise<Response>>).mockImplementationOnce(
      async () => new Response("unavailable", { status: 503 }),
    );
    await expect(minecraft.downloads.vanilla("1.21.1", FIXTURE_DIR)).rejects.toMatchObject({
      key: "minecraft.downloadFailed",
      status: 502,
    });
  });
  it("validates server slugs correctly", async () => {
    await expect(
      minecraft.servers.create({ slug: "INVALID SLUG", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" }),
    ).rejects.toMatchObject({ key: "minecraft.invalidSlug", status: 400 });

    await expect(
      minecraft.servers.create({ slug: "ab", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" }),
    ).rejects.toMatchObject({ key: "minecraft.invalidSlug", status: 400 });
  });
  it("creates a scaffolded server with defaults and updates its java arguments", async () => {
    const s = await minecraft.servers.create({
      slug: "test-java-args",
      displayName: "Java Args Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      javaArgs: "-Xms2G -Xmx4G",
    });
    expect(s.javaArgs).toBe("-Xms2G -Xmx4G");
    expect(await readFile(join(s.serverDir, "server.jar"), "utf8")).toBe("test jar bytes");
    expect(await readFile(join(s.serverDir, "eula.txt"), "utf8")).toBe("eula=true\n");
    expect(existsSync(join(s.serverDir, "world", "datapacks"))).toBe(true);
    expect(await minecraft.properties.read("test-java-args")).toMatchObject({
      "server-name": "Java Args Server",
      motd: "A Minecraft Server: Java Args Server",
    });

    const updated = await minecraft.servers.update("test-java-args", {
      javaArgs: "-Xms4G -Xmx8G -XX:+UseG1GC",
    });
    expect(updated.javaArgs).toBe("-Xms4G -Xmx8G -XX:+UseG1GC");

    await minecraft.servers.remove("test-java-args", true);
  }, 90000);
});
