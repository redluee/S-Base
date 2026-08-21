import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinecraftService, parseJavaArgs, formatJavaLaunchCommand, AIKAR_FLAGS, ZGC_FLAGS } from "./index";
import { join } from "path";
import { tmpdir } from "os";
import { mkdir, writeFile, rm } from "fs/promises";
import db from "../../db/client";
import { mc_servers, mc_templates } from "../../db/schema/minecraft";
import { eq } from "drizzle-orm";

describe("MinecraftService", () => {
  let minecraft: MinecraftService;
  const testDir = join(tmpdir(), "sbase-mc-test-" + Date.now());

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
  });

  it("lists available versions as string array", async () => {
    const versions = await minecraft.listAvailableVersions();
    expect(Array.isArray(versions)).toBe(true);
    if (versions.length > 0) {
      expect(typeof versions[0]).toBe("string");
      expect(versions.some(v => v.startsWith("1."))).toBe(true);
    }
  });

  it("validates server slugs correctly", async () => {
    expect(async () => {
      await minecraft.createServer({ slug: "INVALID SLUG", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" });
    }).toThrow();

    expect(async () => {
      await minecraft.createServer({ slug: "ab", displayName: "Test", engine: "vanilla", mcVersion: "1.21.1" });
    }).toThrow();
  });

  it("handles player events, stats tracking, ban, and unban", async () => {
    const srvDir = join(testDir, "test-server-stats");
    await mkdir(srvDir, { recursive: true });

    // Insert mock server
    const inserted = db.insert(mc_servers).values({
      slug: "test-server-stats",
      displayName: "Test Stats Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).returning().get();

    const playerUuid = "12345678-1234-1234-1234-123456789abc";
    const playerName = "Steve";

    // Player joins (with realistic log prefix)
    minecraft.parsePlayerEvent("test-server-stats", `[20:14:59] [User Authenticator #1/INFO]: UUID of player ${playerName} is ${playerUuid}`);
    const playersJoined = await minecraft.getPlayers("test-server-stats");
    expect(playersJoined.online.length).toBe(1);
    expect(playersJoined.online[0].playerUuid).toBe(playerUuid);
    expect(playersJoined.online[0].playerName).toBe(playerName);

    // Redundant join without leave does not duplicate online list
    minecraft.parsePlayerEvent("test-server-stats", `[20:15:00] [User Authenticator #1/INFO]: UUID of player ${playerName} is ${playerUuid}`);
    const playersJoinedAgain = await minecraft.getPlayers("test-server-stats");
    expect(playersJoinedAgain.online.length).toBe(1);
    expect(playersJoinedAgain.online[0].playerName).toBe(playerName);

    // Player leaves with server log prefix
    minecraft.parsePlayerEvent("test-server-stats", `[20:28:58] [Server thread/INFO]: ${playerName} left the game`);
    const playersLeft = await minecraft.getPlayers("test-server-stats");
    expect(playersLeft.online.length).toBe(0);
    expect(playersLeft.history.length).toBe(1);
    expect(playersLeft.history[0].playerName).toBe(playerName);

    // Ban player
    await minecraft.banPlayer("test-server-stats", playerName, "Griefing");
    const playersBanned = await minecraft.getPlayers("test-server-stats");
    expect(playersBanned.banned?.length).toBe(1);
    expect(playersBanned.banned?.[0].name).toBe(playerName);

    // Unban player
    await minecraft.unbanPlayer("test-server-stats", playerUuid);
    const playersUnbanned = await minecraft.getPlayers("test-server-stats");
    expect(playersUnbanned.banned?.length).toBe(0);

    // Clean up db
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-stats")).run();
  });

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
    await minecraft.writeProperties("test-server-files", { "online-mode": "false", "gamemode": "survival" }, srvDir);
    const props = await minecraft.readProperties("test-server-files");
    expect(props["online-mode"]).toBe("false");
    expect(props["gamemode"]).toBe("survival");

    // File operations
    const dummyBuffer = new TextEncoder().encode("dummy mod content").buffer;
    await minecraft.uploadFile("test-server-files", "mods", "test-mod.jar", dummyBuffer);
    
    const files = await minecraft.listFiles("test-server-files", "mods");
    expect(files.length).toBe(1);
    expect(files[0].name).toBe("test-mod.jar");
    expect(files[0].size).toBeGreaterThan(0);
    expect(typeof files[0].modified).toBe("string");

    // Delete file
    await minecraft.deleteFile("test-server-files", "mods", "test-mod.jar");
    const filesAfter = await minecraft.listFiles("test-server-files", "mods");
    expect(filesAfter.length).toBe(0);

    // Startup error parsing
    await writeFile(join(srvDir, "logs", "latest.log"), "[12:00:00] [Server thread/ERROR]: Failed to start server\n[12:00:01] [Server thread/FATAL]: Crash");
    const errorReport = await minecraft.getStartupError("test-server-files");
    expect(errorReport.lines.length).toBeGreaterThan(0);
    expect(errorReport.lines.some(l => l.includes("ERROR"))).toBe(true);

    // Clean shutdown logs should not be reported as startup error
    await writeFile(join(srvDir, "logs", "latest.log"), "[20:07:45] [Server thread/INFO]: Stopping the server\n[20:07:45] [Server thread/INFO]: ThreadedAnvilChunkStorage: All dimensions are saved");
    const cleanReport = await minecraft.getStartupError("test-server-files");
    expect(cleanReport.lines.length).toBe(0);

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-files")).run();
  });

  it("handles startPlayerTracking safely without throwing TypeError", async () => {
    const srvDir = join(testDir, "test-server-tracking");
    await mkdir(join(srvDir, "logs"), { recursive: true });
    await writeFile(join(srvDir, "logs", "latest.log"), "");

    expect(() => {
      minecraft.startPlayerTracking("test-server-tracking", srvDir);
    }).not.toThrow();
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
    (minecraft as any).sendCommand = async (slug: string, cmd: string) => {
      commandsSent.push(cmd);
    };

    // When stopped (isRunning is false)
    (minecraft as any).isRunning = () => false;
    await minecraft.writeProperties("test-server-live-props", {
      difficulty: "hard",
      gamemode: "creative",
      "white-list": "true",
      "player-idle-timeout": "10",
      "do-fire-tick": "false",
    }, srvDir);
    expect(commandsSent.length).toBe(0);

    // When running (isRunning is true)
    (minecraft as any).isRunning = () => true;
    await minecraft.writeProperties("test-server-live-props", {
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

  it("inspects and imports existing server folders", async () => {
    const existingDir = join(testDir, "my-existing-server");
    await mkdir(existingDir, { recursive: true });
    await writeFile(join(existingDir, "server.properties"), "server-name=My Cool SMP\nmotd=Welcome to SMP\ndifficulty=hard\ngamemode=survival\nlevel-name=world\n");
    await writeFile(join(existingDir, "eula.txt"), "eula=false\n");
    await writeFile(join(existingDir, "fabric-server-launch.jar"), "dummy jar");
    await mkdir(join(existingDir, "world"), { recursive: true });
    await mkdir(join(existingDir, "logs"), { recursive: true });
    await writeFile(join(existingDir, "logs", "latest.log"), "[10:00:00] [Server thread/INFO]: Starting minecraft server version 1.21.1\n");

    // Inspect
    const inspection = await minecraft.inspectServerDirectory(existingDir);
    expect(inspection.isValid).toBe(true);
    expect(inspection.detectedEngine).toBe("fabric");
    expect(inspection.detectedVersion).toBe("1.21.1");
    expect(inspection.detectedDisplayName).toBe("My Cool SMP");
    expect(inspection.hasProperties).toBe(true);
    expect(inspection.hasWorld).toBe(true);
    expect(inspection.properties.difficulty).toBe("hard");

    // Import
    const imported = await minecraft.importServer({
      slug: "my-cool-smp",
      displayName: "My Cool SMP",
      engine: "fabric",
      mcVersion: "1.21.1",
      serverDir: existingDir,
    });

    expect(imported).not.toBeNull();
    expect(imported?.slug).toBe("my-cool-smp");
    expect(imported?.serverDir).toBe(existingDir);
    expect(imported?.engine).toBe("fabric");
    expect(imported?.mcVersion).toBe("1.21.1");

    // Check that eula.txt was updated to true
    const eulaContent = await Bun.file(join(existingDir, "eula.txt")).text();
    expect(eulaContent).toContain("eula=true");

    // Check duplicate slug validation
    expect(async () => {
      await minecraft.importServer({
        slug: "my-cool-smp",
        displayName: "Duplicate",
        engine: "vanilla",
        mcVersion: "1.21.1",
        serverDir: existingDir,
      });
    }).toThrow();

    // Clean up
    await rm(existingDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "my-cool-smp")).run();
  });

  it("creates custom template with version, engine, properties and mods", async () => {
    const tmpl = await minecraft.createCustomTemplate({
      name: "Custom Template Test",
      engine: "fabric",
      mcVersion: "1.21.1",
      notes: "Custom speedrun template",
      properties: {
        gamemode: "survival",
        difficulty: "hard",
        "max-players": "10",
        "online-mode": "false",
      },
    });

    expect(tmpl).not.toBeNull();
    expect(tmpl?.name).toBe("Custom Template Test");
    expect(tmpl?.engine).toBe("fabric");
    expect(tmpl?.mcVersion).toBe("1.21.1");
    expect(tmpl?.propertiesJson).toContain("survival");

    const templateId = tmpl!.templateId;

    // Upload mod to template
    const dummyModBuffer = new TextEncoder().encode("dummy fabric mod content").buffer;
    await minecraft.uploadTemplateFile(templateId, "mods", "fabric-api.jar", dummyModBuffer);

    // List template files
    const modFiles = await minecraft.listTemplateFiles(templateId, "mods");
    expect(modFiles.length).toBe(1);
    expect(modFiles[0].name).toBe("fabric-api.jar");

    // Delete template file test
    await minecraft.uploadTemplateFile(templateId, "datapacks", "custom-pack.zip", dummyModBuffer);
    const dataPacksBefore = await minecraft.listTemplateFiles(templateId, "datapacks");
    expect(dataPacksBefore.length).toBe(1);

    await minecraft.deleteTemplateFile(templateId, "datapacks", "custom-pack.zip");
    const dataPacksAfter = await minecraft.listTemplateFiles(templateId, "datapacks");
    expect(dataPacksAfter.length).toBe(0);

    // Speedrun from this template
    const speedrunServer = await minecraft.speedrunFromTemplate(templateId, "tmpl-speedrun-test", "Speedrun Server");
    expect(speedrunServer).not.toBeNull();
    expect(speedrunServer?.engine).toBe("fabric");
    expect(speedrunServer?.mcVersion).toBe("1.21.1");

    // Check server properties copied from template
    const srvProps = await minecraft.readProperties("tmpl-speedrun-test");
    expect(srvProps.gamemode).toBe("survival");
    expect(srvProps.difficulty).toBe("hard");
    expect(srvProps["max-players"]).toBe("10");

    // Check files were copied over
    const srvMods = await minecraft.listFiles("tmpl-speedrun-test", "mods");
    expect(srvMods.some(m => m.name === "fabric-api.jar")).toBe(true);

    // Clean up
    await minecraft.deleteTemplate(templateId);
    await minecraft.deleteServer("tmpl-speedrun-test", true);
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
    const s = await minecraft.createServer({
      slug: "test-java-args",
      displayName: "Java Args Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      javaArgs: "-Xms2G -Xmx4G",
    });
    expect(s?.javaArgs).toBe("-Xms2G -Xmx4G");

    // Update javaArgs
    const updated = await minecraft.updateServer("test-java-args", {
      javaArgs: "-Xms4G -Xmx8G -XX:+UseG1GC",
    });
    expect(updated?.javaArgs).toBe("-Xms4G -Xmx8G -XX:+UseG1GC");

    // Clean up
    await minecraft.deleteServer("test-java-args", true);
  });
});

