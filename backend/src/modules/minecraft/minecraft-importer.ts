import { existsSync } from "fs";
import { mkdir, readdir, readFile, stat } from "fs/promises";
import { basename, join, resolve } from "path";
import { DEFAULT_MOTD_PREFIX, toServerSlug } from "../../shared/minecraft";
import { ValidationError } from "../../utils/errors";
import type { MinecraftService } from "./index";
import { BASE_DIR } from "./paths";
import { DEFAULT_LEVEL_NAME, latestLogPath } from "./server-layout";
import { readPropertiesFile } from "./server-properties";
import { requireText } from "./validation";

const DEFAULT_MOTD = new RegExp(`^${DEFAULT_MOTD_PREFIX}:\\s*`, "i");

export interface ServerInspection {
  isValid: boolean;
  serverDir: string;
  folderName: string;
  hasProperties: boolean;
  hasWorld: boolean;
  hasEula: boolean;
  eulaAccepted: boolean;
  hasJar: boolean;
  jarFiles: string[];
  detectedEngine: "vanilla" | "fabric";
  detectedVersion?: string;
  detectedDisplayName?: string;
  properties: Record<string, string>;
  error?: string;
}

export interface ImportServerInput {
  slug: string;
  displayName: string;
  engine: string;
  mcVersion: string;
  serverDir: string;
  javaArgs?: string | null;
}

function invalidInspection(serverDir: string, folderName: string, error: string): ServerInspection {
  return {
    isValid: false,
    serverDir,
    folderName,
    hasProperties: false,
    hasWorld: false,
    hasEula: false,
    eulaAccepted: false,
    hasJar: false,
    jarFiles: [],
    detectedEngine: "vanilla",
    properties: {},
    error,
  };
}

async function detectVersion(dir: string, files: string[], jarFiles: string[]): Promise<string | undefined> {
  const logPath = latestLogPath(dir);
  if (files.includes("logs") && existsSync(logPath)) {
    try {
      const head = (await readFile(logPath, "utf-8")).slice(0, 10000);
      const match =
        head.match(/Starting minecraft server version ([\w.-]+)/i) ||
        head.match(/Loading Minecraft ([\w.-]+)/i) ||
        head.match(/Minecraft Server (\d+\.\d+(\.\d+)?)/i);
      if (match) return match[1];
    } catch {}
  }
  for (const jar of jarFiles) {
    const match = jar.match(/(\d+\.\d+(\.\d+)?)/);
    if (match) return match[1];
  }
  return undefined;
}

export class MinecraftImporter {
  constructor(private readonly parts: MinecraftService) {}

  async inspect(targetPath: string): Promise<ServerInspection> {
    const dir = resolve(targetPath);
    const folderName = basename(dir);

    if (!existsSync(dir)) return invalidInspection(dir, folderName, "minecraft.directoryNotFound");

    try {
      if (!(await stat(dir)).isDirectory()) return invalidInspection(dir, folderName, "minecraft.notADirectory");

      const files = await readdir(dir);
      const jarFiles = files.filter((f) => f.endsWith(".jar"));
      const hasProperties = files.includes("server.properties");
      const hasEula = files.includes("eula.txt");

      const eulaAccepted = hasEula && (await this.parts.dirs.eulaAccepted(dir));
      const properties = hasProperties ? await readPropertiesFile(dir) : {};
      const levelName = properties["level-name"] || DEFAULT_LEVEL_NAME;
      const isFabric = jarFiles.some((j) => j.toLowerCase().includes("fabric")) || files.includes(".fabric");
      const motdName = properties.motd?.replace(DEFAULT_MOTD, "");

      return {
        isValid: true,
        serverDir: dir,
        folderName,
        hasProperties,
        hasWorld: files.includes(levelName) || files.includes(DEFAULT_LEVEL_NAME),
        hasEula,
        eulaAccepted,
        hasJar: jarFiles.length > 0,
        jarFiles,
        detectedEngine: isFabric ? "fabric" : "vanilla",
        detectedVersion: await detectVersion(dir, files, jarFiles),
        detectedDisplayName: properties["server-name"] || motdName || folderName,
        properties,
      };
    } catch {
      return invalidInspection(dir, folderName, "minecraft.inspectFailed");
    }
  }

  async scan() {
    await mkdir(BASE_DIR, { recursive: true });
    const registered = this.parts.servers.rows();
    const registeredDirs = new Set(registered.map((s) => resolve(s.serverDir)));
    const registeredSlugs = new Set(registered.map((s) => s.slug));

    const unlinked: { serverDir: string; folderName: string; suggestedSlug: string; inspection: ServerInspection }[] =
      [];
    for (const entry of await readdir(BASE_DIR)) {
      const fullPath = resolve(join(BASE_DIR, entry));
      if (registeredDirs.has(fullPath)) continue;
      try {
        if (!(await stat(fullPath)).isDirectory()) continue;
        const inspection = await this.inspect(fullPath);
        if (!inspection.isValid) continue;

        const suggestedSlug = toServerSlug(entry);
        unlinked.push({
          serverDir: fullPath,
          folderName: entry,
          suggestedSlug: registeredSlugs.has(suggestedSlug)
            ? `${suggestedSlug}-${Date.now().toString().slice(-4)}`
            : suggestedSlug,
          inspection,
        });
      } catch {}
    }
    return unlinked;
  }

  async import(data: ImportServerInput) {
    const server = this.parts.servers.validateNew(data);
    const dir = resolve(requireText(data.serverDir, "minecraft.directoryNotFound"));
    if (!existsSync(dir)) throw new ValidationError("minecraft.directoryNotFound");
    if (!(await stat(dir)).isDirectory()) throw new ValidationError("minecraft.notADirectory");

    await this.parts.dirs.scaffold(dir);
    return this.parts.servers.register({ ...server, serverDir: dir });
  }
}
