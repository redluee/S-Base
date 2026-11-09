import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft importer", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("inspects and imports existing server folders", async () => {
    const existingDir = join(testDir, "my-existing-server");
    await mkdir(existingDir, { recursive: true });
    await writeFile(
      join(existingDir, "server.properties"),
      "server-name=My Cool SMP\nmotd=Welcome to SMP\ndifficulty=hard\ngamemode=survival\nlevel-name=world\n",
    );
    await writeFile(join(existingDir, "eula.txt"), "eula=false\n");
    await writeFile(join(existingDir, "fabric-server-launch.jar"), "dummy jar");
    await mkdir(join(existingDir, "world"), { recursive: true });
    await mkdir(join(existingDir, "logs"), { recursive: true });
    await writeFile(
      join(existingDir, "logs", "latest.log"),
      "[10:00:00] [Server thread/INFO]: Starting minecraft server version 1.21.1\n",
    );

    // Inspect
    const inspection = await minecraft.importer.inspect(existingDir);
    expect(inspection.isValid).toBe(true);
    expect(inspection.detectedEngine).toBe("fabric");
    expect(inspection.detectedVersion).toBe("1.21.1");
    expect(inspection.detectedDisplayName).toBe("My Cool SMP");
    expect(inspection.hasProperties).toBe(true);
    expect(inspection.hasWorld).toBe(true);
    expect(inspection.properties.difficulty).toBe("hard");

    // Import
    const imported = await minecraft.importer.import({
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
    await expect(
      minecraft.importer.import({
        slug: "my-cool-smp",
        displayName: "Duplicate",
        engine: "vanilla",
        mcVersion: "1.21.1",
        serverDir: existingDir,
      }),
    ).rejects.toMatchObject({ key: "minecraft.slugExists", status: 409 });

    // Clean up
    await rm(existingDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "my-cool-smp")).run();
  });
});
