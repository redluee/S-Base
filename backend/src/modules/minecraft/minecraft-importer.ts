import { existsSync } from "fs";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { basename, join, resolve } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { ConflictError, ValidationError } from "../../utils/errors";
import type { MinecraftParts } from "./minecraft-parts";
import { BASE_DIR } from "./paths";
import { requireText, validateEngine, validateSlug } from "./validation";

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

async function readProperties(path: string): Promise<Record<string, string>> {
  const properties: Record<string, string> = {};
  try {
    for (const line of (await readFile(path, "utf-8")).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > -1) properties[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  } catch {}
  return properties;
}

async function detectVersion(dir: string, files: string[], jarFiles: string[]): Promise<string | undefined> {
  const logPath = join(dir, "logs", "latest.log");
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
  constructor(private readonly parts: MinecraftParts) {}

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

      let eulaAccepted = false;
      if (hasEula) {
        try {
          eulaAccepted = /eula\s*=\s*true/i.test(await readFile(join(dir, "eula.txt"), "utf-8"));
        } catch {}
      }

      const properties = hasProperties ? await readProperties(join(dir, "server.properties")) : {};
      const levelName = properties["level-name"] || "world";
      const isFabric = jarFiles.some((j) => j.toLowerCase().includes("fabric")) || files.includes(".fabric");
      const motdName = properties.motd?.replace(/^A Minecraft Server:\s*/i, "");

      return {
        isValid: true,
        serverDir: dir,
        folderName,
        hasProperties,
        hasWorld: files.includes(levelName) || files.includes("world"),
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

        const suggestedSlug = entry
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 32);
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
    validateSlug(data.slug);
    const displayName = requireText(data.displayName, "minecraft.displayNameRequired");
    const mcVersion = requireText(data.mcVersion, "minecraft.versionRequired");
    const engine = validateEngine(data.engine);
    if (this.parts.servers.findBySlug(data.slug)) throw new ConflictError("minecraft.slugExists");

    const dir = resolve(requireText(data.serverDir, "minecraft.directoryNotFound"));
    if (!existsSync(dir)) throw new ValidationError("minecraft.directoryNotFound");
    if (!(await stat(dir)).isDirectory()) throw new ValidationError("minecraft.notADirectory");

    const eulaPath = join(dir, "eula.txt");
    try {
      if (!existsSync(eulaPath)) {
        await writeFile(eulaPath, "eula=true\n");
      } else {
        const content = await readFile(eulaPath, "utf-8");
        if (!/eula\s*=\s*true/i.test(content)) {
          await writeFile(eulaPath, content.replace(/eula\s*=\s*false/i, "eula=true"));
        }
      }
    } catch {}

    for (const sub of ["mods", "resourcepacks", "logs", "world"]) {
      await mkdir(join(dir, sub), { recursive: true });
    }
    await this.parts.dirs.ensureDatapacksDir(dir);

    db.insert(mc_servers)
      .values({ slug: data.slug, displayName, engine, mcVersion, javaArgs: data.javaArgs || null, serverDir: dir })
      .run();

    return this.parts.servers.get(data.slug);
  }
}
