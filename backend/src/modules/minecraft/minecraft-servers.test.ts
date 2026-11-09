import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readFile } from "fs/promises";
import { join } from "path";
import { setupTestDb } from "../../test-utils";
import { MinecraftService, parseJavaArgs, formatJavaLaunchCommand, AIKAR_FLAGS, ZGC_FLAGS } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft servers and downloads", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

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
  it("validates server slugs correctly", async () => {
    await expect(
      minecraft.servers.create({ slug: "INVALID SLUG", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" }),
    ).rejects.toMatchObject({ key: "minecraft.invalidSlug", status: 400 });

    await expect(
      minecraft.servers.create({ slug: "ab", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" }),
    ).rejects.toMatchObject({ key: "minecraft.invalidSlug", status: 400 });
  });
  it("parses Java arguments and handles custom RAM allocation correctly", async () => {
    // Test parseJavaArgs
    expect(parseJavaArgs(null)).toEqual([]);
    expect(parseJavaArgs("")).toEqual([]);
    expect(parseJavaArgs("-Xms2G -Xmx4G -XX:+UseG1GC")).toEqual(["-Xms2G", "-Xmx4G", "-XX:+UseG1GC"]);
    expect(parseJavaArgs('["-Xms1G", "-Xmx2G"]')).toEqual(["-Xms1G", "-Xmx2G"]);

    // Test formatJavaLaunchCommand with default memory and modern Aikar GC flags
    const defaultCmd = formatJavaLaunchCommand("vanilla", testDir, null);
    expect(defaultCmd).toContain("-Xms2G -Xmx2G");
    expect(defaultCmd).toContain("-XX:+UseG1GC");
    expect(defaultCmd).toContain("-XX:+ParallelRefProcEnabled");
    expect(defaultCmd).toContain("-Dusing.aikars.flags=https://mcflags.emc.gs");
    expect(defaultCmd).toBe(`java -Xms2G -Xmx2G ${AIKAR_FLAGS.join(" ")} -jar server.jar nogui`);

    // Test formatJavaLaunchCommand with custom RAM flags and G1GC
    const customMemCmd = formatJavaLaunchCommand("vanilla", testDir, "-Xms4G -Xmx8G -XX:+UseG1GC");
    expect(customMemCmd).toBe("java -Xms4G -Xmx8G -XX:+UseG1GC -jar server.jar nogui");

    // Test formatJavaLaunchCommand with Generational ZGC flags
    const zgcCmd = formatJavaLaunchCommand("vanilla", testDir, `-Xms8G -Xmx8G ${ZGC_FLAGS.join(" ")}`);
    expect(zgcCmd).toBe(`java -Xms8G -Xmx8G ${ZGC_FLAGS.join(" ")} -jar server.jar nogui`);

    // Test formatJavaLaunchCommand with only -Xmx
    const onlyXmxCmd = formatJavaLaunchCommand("vanilla", testDir, "-Xmx6G");
    expect(onlyXmxCmd).toBe("java -Xms512M -Xmx6G -jar server.jar nogui");

    // Create server and test updateServer with custom javaArgs
    const s = await minecraft.servers.create({
      slug: "test-java-args",
      displayName: "Java Args Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      javaArgs: "-Xms2G -Xmx4G",
    });
    expect(s?.javaArgs).toBe("-Xms2G -Xmx4G");
    expect(await readFile(join(s!.serverDir, "server.jar"), "utf8")).toBe("test jar bytes");

    // Update javaArgs
    const updated = await minecraft.servers.update("test-java-args", {
      javaArgs: "-Xms4G -Xmx8G -XX:+UseG1GC",
    });
    expect(updated?.javaArgs).toBe("-Xms4G -Xmx8G -XX:+UseG1GC");

    // Clean up
    await minecraft.servers.remove("test-java-args", true);
  }, 90000);
});
