import { existsSync } from "fs";
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { DEFAULT_LEVEL_NAME, eulaPath, SERVER_SUBDIRS } from "./server-layout";
import { readPropertiesFile } from "./server-properties";

const EULA_ACCEPTED = /eula\s*=\s*true/i;

export class MinecraftDirs {
  async levelName(serverDir: string): Promise<string> {
    return (await readPropertiesFile(serverDir))["level-name"] || DEFAULT_LEVEL_NAME;
  }

  async ensureDatapacksDir(serverDir: string): Promise<string> {
    const worldDatapacksDir = join(serverDir, await this.levelName(serverDir), "datapacks");
    await mkdir(worldDatapacksDir, { recursive: true });

    const rootDatapacksDir = join(serverDir, "datapacks");
    if (existsSync(rootDatapacksDir)) {
      try {
        const rootStat = await lstat(rootDatapacksDir);
        if (rootStat.isDirectory() && !rootStat.isSymbolicLink()) {
          for (const f of await readdir(rootDatapacksDir)) {
            const dstPath = join(worldDatapacksDir, f);
            if (!existsSync(dstPath)) {
              await copyFile(join(rootDatapacksDir, f), dstPath).catch(() => {});
            }
          }
        }
      } catch {}
    }

    return worldDatapacksDir;
  }

  async subdir(serverDir: string, type: string): Promise<string> {
    if (type === "datapacks") return this.ensureDatapacksDir(serverDir);
    const targetDir = join(serverDir, type);
    await mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  async scaffold(serverDir: string) {
    await mkdir(serverDir, { recursive: true });
    await this.acceptEula(serverDir);
    for (const sub of SERVER_SUBDIRS) {
      await mkdir(join(serverDir, sub), { recursive: true });
    }
    await this.ensureDatapacksDir(serverDir);
  }

  private async acceptEula(serverDir: string) {
    const path = eulaPath(serverDir);
    if (!existsSync(path)) {
      await writeFile(path, "eula=true\n");
      return;
    }
    const content = await readFile(path, "utf-8");
    if (!EULA_ACCEPTED.test(content)) await writeFile(path, content.replace(/eula\s*=\s*false/i, "eula=true"));
  }

  async eulaAccepted(serverDir: string): Promise<boolean> {
    try {
      return EULA_ACCEPTED.test(await readFile(eulaPath(serverDir), "utf-8"));
    } catch {
      return false;
    }
  }
}
