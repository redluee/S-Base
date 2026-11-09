import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft templates", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("creates custom template with version, engine, properties and mods", async () => {
    const tmpl = await minecraft.templates.createCustom({
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
    await minecraft.templates.uploadFile(templateId, "mods", "fabric-api.jar", dummyModBuffer);

    // List template files
    const modFiles = await minecraft.templates.listFiles(templateId, "mods");
    expect(modFiles.length).toBe(1);
    expect(modFiles[0].name).toBe("fabric-api.jar");

    // Delete template file test
    await minecraft.templates.uploadFile(templateId, "datapacks", "custom-pack.zip", dummyModBuffer);
    const dataPacksBefore = await minecraft.templates.listFiles(templateId, "datapacks");
    expect(dataPacksBefore.length).toBe(1);

    await minecraft.templates.removeFile(templateId, "datapacks", "custom-pack.zip");
    const dataPacksAfter = await minecraft.templates.listFiles(templateId, "datapacks");
    expect(dataPacksAfter.length).toBe(0);

    // Speedrun from this template
    const speedrunServer = await minecraft.templates.speedrun(templateId, "tmpl-speedrun-test", "Speedrun Server");
    expect(speedrunServer).not.toBeNull();
    expect(speedrunServer?.engine).toBe("fabric");
    expect(speedrunServer?.mcVersion).toBe("1.21.1");
    expect(await readFile(join(speedrunServer!.serverDir, "fabric-server-launch.jar"), "utf8")).toBe("test fabric jar");

    // Check server properties copied from template
    const srvProps = await minecraft.properties.read("tmpl-speedrun-test");
    expect(srvProps.gamemode).toBe("survival");
    expect(srvProps.difficulty).toBe("hard");
    expect(srvProps["max-players"]).toBe("10");

    // Check files were copied over
    const srvMods = await minecraft.files.list("tmpl-speedrun-test", "mods");
    expect(srvMods.some((m) => m.name === "fabric-api.jar")).toBe(true);

    // Clean up
    await minecraft.templates.remove(templateId);
    await minecraft.servers.remove("tmpl-speedrun-test", true);
  }, 90000);
  it("handles custom level-name and template deployment with datapacks", async () => {
    const srvDir = join(testDir, "test-custom-level-name");
    await mkdir(join(srvDir, "custom_world"), { recursive: true });
    await writeFile(join(srvDir, "server.properties"), "level-name=custom_world\nmotd=Custom Level\n");

    db.insert(mc_servers)
      .values({
        slug: "test-custom-level-name",
        displayName: "Custom Level Name Server",
        engine: "vanilla",
        mcVersion: "1.21.1",
        serverDir: srvDir,
      })
      .run();

    const packBuffer = new TextEncoder().encode("custom level pack content").buffer;
    await minecraft.files.upload("test-custom-level-name", "datapacks", "custom-level.zip", packBuffer);

    // Verify it was stored in custom_world/datapacks
    const targetPath = join(srvDir, "custom_world", "datapacks", "custom-level.zip");
    const targetContent = await readFile(targetPath, "utf-8");
    expect(targetContent).toBe("custom level pack content");

    // Save as template
    const tmpl = await minecraft.templates.saveFromServer(
      "test-custom-level-name",
      "Custom Level Template",
      "Saved template",
    );
    expect(tmpl).not.toBeNull();
    const templateId = tmpl!.templateId;

    const tmplDatapacks = await minecraft.templates.listFiles(templateId, "datapacks");
    expect(tmplDatapacks.some((f) => f.name === "custom-level.zip")).toBe(true);

    // Speedrun from template
    const newSrv = await minecraft.templates.speedrun(templateId, "tmpl-speedrun-dp", "Speedrun Datapack Server");
    expect(newSrv).not.toBeNull();

    const speedrunPacks = await minecraft.files.list("tmpl-speedrun-dp", "datapacks");
    expect(speedrunPacks.some((f) => f.name === "custom-level.zip")).toBe(true);

    // Clean up
    await minecraft.templates.remove(templateId);
    await minecraft.servers.remove("tmpl-speedrun-dp", true);
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-custom-level-name")).run();
  }, 90000);
});
