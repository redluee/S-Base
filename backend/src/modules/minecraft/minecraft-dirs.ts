import { existsSync, readFileSync } from "fs";
import { copyFile, lstat, mkdir, readdir } from "fs/promises";
import { join } from "path";

export class MinecraftDirs {
  levelName(serverDir: string): string {
    try {
      const propPath = join(serverDir, "server.properties");
      if (existsSync(propPath)) {
        for (const line of readFileSync(propPath, "utf-8").split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx > -1 && trimmed.substring(0, idx).trim() === "level-name") {
            const val = trimmed.substring(idx + 1).trim();
            if (val) return val;
          }
        }
      }
    } catch {}
    return "world";
  }

  async ensureDatapacksDir(serverDir: string): Promise<string> {
    const worldDatapacksDir = join(serverDir, this.levelName(serverDir), "datapacks");
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
}
