import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft properties and files", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("manages properties and file operations", async () => {
    const srvDir = join(testDir, "test-server-files");
    await mkdir(join(srvDir, "mods"), { recursive: true });
    await mkdir(join(srvDir, "logs"), { recursive: true });

    db.insert(mc_servers).values({
      slug: "test-server-files",
      displayName: "Files Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    // Write properties
    await minecraft.properties.write("test-server-files", { "online-mode": "false", "gamemode": "survival" }, srvDir);
    const props = await minecraft.properties.read("test-server-files");
    expect(props["online-mode"]).toBe("false");
    expect(props["gamemode"]).toBe("survival");

    // File operations
    const dummyBuffer = new TextEncoder().encode("dummy mod content").buffer;
    await minecraft.files.upload("test-server-files", "mods", "test-mod.jar", dummyBuffer);
    
    const files = await minecraft.files.list("test-server-files", "mods");
    expect(files.length).toBe(1);
    expect(files[0].name).toBe("test-mod.jar");
    expect(files[0].size).toBeGreaterThan(0);
    expect(typeof files[0].modified).toBe("string");

    // Delete file
    await minecraft.files.remove("test-server-files", "mods", "test-mod.jar");
    const filesAfter = await minecraft.files.list("test-server-files", "mods");
    expect(filesAfter.length).toBe(0);

    // Startup error parsing
    await writeFile(join(srvDir, "logs", "latest.log"), "[12:00:00] [Server thread/ERROR]: Failed to start server\n[12:00:01] [Server thread/FATAL]: Crash");
    const errorReport = await minecraft.diagnostics.startupError("test-server-files");
    expect(errorReport.lines.length).toBeGreaterThan(0);
    expect(errorReport.lines.some(l => l.includes("ERROR"))).toBe(true);

    // Clean shutdown logs should not be reported as startup error
    await writeFile(join(srvDir, "logs", "latest.log"), "[20:07:45] [Server thread/INFO]: Stopping the server\n[20:07:45] [Server thread/INFO]: ThreadedAnvilChunkStorage: All dimensions are saved");
    const cleanReport = await minecraft.diagnostics.startupError("test-server-files");
    expect(cleanReport.lines.length).toBe(0);

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-files")).run();
  });
  it("dispatches live console commands when updating running server properties", async () => {
    const srvDir = join(testDir, "test-server-live-props");
    await mkdir(srvDir, { recursive: true });

    db.insert(mc_servers).values({
      slug: "test-server-live-props",
      displayName: "Live Props Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    const commandsSent: string[] = [];
    spyOn(minecraft.lifecycle, "sendCommand").mockImplementation(async (_slug: string, cmd: string) => {
      commandsSent.push(cmd);
    });

    // When stopped (isRunning is false)
    const isRunning = spyOn(minecraft.lifecycle, "isRunning").mockImplementation(() => false);
    await minecraft.properties.write("test-server-live-props", {
      difficulty: "hard",
      gamemode: "creative",
      "white-list": "true",
      "player-idle-timeout": "10",
      "do-fire-tick": "false",
    }, srvDir);
    expect(commandsSent.length).toBe(0);

    // When running (isRunning is true)
    isRunning.mockImplementation(() => true);
    await minecraft.properties.write("test-server-live-props", {
      difficulty: "hard",
      gamemode: "creative",
      "white-list": "true",
      "player-idle-timeout": "10",
      "do-fire-tick": "false",
    }, srvDir);

    expect(commandsSent).toContain("difficulty hard");
    expect(commandsSent).toContain("defaultgamemode creative");
    expect(commandsSent).toContain("whitelist on");
    expect(commandsSent).toContain("whitelist reload");
    expect(commandsSent).toContain("setidletimeout 10");
    expect(commandsSent).toContain("gamerule doFireTick false");

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-live-props")).run();
  });
  it("handles datapack storage in world folder and live reload command", async () => {
    const srvDir = join(testDir, "test-server-datapacks");
    await mkdir(srvDir, { recursive: true });

    db.insert(mc_servers).values({
      slug: "test-server-datapacks",
      displayName: "Datapack Test Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    const commandsSent: string[] = [];
    spyOn(minecraft.lifecycle, "sendCommand").mockImplementation(async (_slug: string, cmd: string) => {
      commandsSent.push(cmd);
    });

    // Stopped server upload
    const isRunning = spyOn(minecraft.lifecycle, "isRunning").mockImplementation(() => false);
    const packBuffer = new TextEncoder().encode("dummy pack content").buffer;
    await minecraft.files.upload("test-server-datapacks", "datapacks", "custom-datapack.zip", packBuffer);

    // Verify datapack was placed in world/datapacks
    const worldPackPath = join(srvDir, "world", "datapacks", "custom-datapack.zip");
    const worldPackContent = await readFile(worldPackPath, "utf-8");
    expect(worldPackContent).toBe("dummy pack content");
    expect(commandsSent.length).toBe(0);

    // List datapacks
    const listed = await minecraft.files.list("test-server-datapacks", "datapacks");
    expect(listed.length).toBe(1);
    expect(listed[0].name).toBe("custom-datapack.zip");

    // Running server upload sends reload
    isRunning.mockImplementation(() => true);
    await minecraft.files.upload("test-server-datapacks", "datapacks", "second-datapack.zip", packBuffer);
    expect(commandsSent).toContain("reload");

    // Running server delete sends reload
    await minecraft.files.remove("test-server-datapacks", "datapacks", "second-datapack.zip");
    expect(commandsSent.filter(c => c === "reload").length).toBe(2);

    const listedAfter = await minecraft.files.list("test-server-datapacks", "datapacks");
    expect(listedAfter.length).toBe(1);
    expect(listedAfter[0].name).toBe("custom-datapack.zip");

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-datapacks")).run();
  });
  it("safely migrates legacy datapacks to world folder while strictly preserving existing world and player data", async () => {
    const srvDir = join(testDir, "test-legacy-server");
    await mkdir(join(srvDir, "world", "playerdata"), { recursive: true });
    await mkdir(join(srvDir, "world", "stats"), { recursive: true });
    await mkdir(join(srvDir, "world", "region"), { recursive: true });
    await mkdir(join(srvDir, "datapacks"), { recursive: true });

    // Existing production world & player files
    const player1DatContent = "PLAYER_1_SAVED_DATA_HEX_BYTES_12345";
    const player1StatsContent = JSON.stringify({ "minecraft:custom": { "minecraft:jump": 142 } });
    const chunkMcaContent = "MCA_CHUNK_HEADER_REGION_DATA_0_0";

    await writeFile(join(srvDir, "world", "playerdata", "player1.dat"), player1DatContent);
    await writeFile(join(srvDir, "world", "stats", "player1.json"), player1StatsContent);
    await writeFile(join(srvDir, "world", "region", "r.0.0.mca"), chunkMcaContent);
    await writeFile(join(srvDir, "datapacks", "legacy-pack.zip"), "LEGACY_DATAPACK_ZIP_CONTENT");

    db.insert(mc_servers).values({
      slug: "test-legacy-server",
      displayName: "Legacy Production Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    // Listing files triggers safe migration
    const files = await minecraft.files.list("test-legacy-server", "datapacks");
    expect(files.some(f => f.name === "legacy-pack.zip")).toBe(true);

    // Verify file is now present in world/datapacks
    const migratedContent = await readFile(join(srvDir, "world", "datapacks", "legacy-pack.zip"), "utf-8");
    expect(migratedContent).toBe("LEGACY_DATAPACK_ZIP_CONTENT");

    // Strictly verify world and player data were completely unchanged
    const checkPlayerDat = await readFile(join(srvDir, "world", "playerdata", "player1.dat"), "utf-8");
    const checkPlayerStats = await readFile(join(srvDir, "world", "stats", "player1.json"), "utf-8");
    const checkChunkMca = await readFile(join(srvDir, "world", "region", "r.0.0.mca"), "utf-8");

    expect(checkPlayerDat).toBe(player1DatContent);
    expect(checkPlayerStats).toBe(player1StatsContent);
    expect(checkChunkMca).toBe(chunkMcaContent);

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-legacy-server")).run();
  });
});
