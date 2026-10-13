import { join, resolve, basename } from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, readFile, readdir, stat } from "fs/promises";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { BASE_DIR } from "./paths";
import { validateSlug } from "./validation";
import type { MinecraftService } from "./index";

export async function getStartupError(this: MinecraftService, slug: string): Promise<{ lines: string[]; crashReport?: string }> {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) return { lines: [] };

  try {
    const logPath = join(server.serverDir, "logs", "latest.log");
    if (!existsSync(logPath)) return { lines: [] };

    const p = Bun.spawnSync(["tail", "-n", "50", logPath]);
    const logText = p.stdout.toString();
    const allLines = logText.split("\n").filter(Boolean);

    const tailText = allLines.slice(-10).join("\n");
    const cleanShutdownRegex = /(Stopping\s+(the\s+)?server|Closing\s+Server|All\s+dimensions\s+are\s+saved|Saving\s+chunks|Server\s+empty\s+for\s+\d+\s+seconds,\s+pausing)/i;
    if (cleanShutdownRegex.test(tailText)) {
      return { lines: [] };
    }

    const crDir = join(server.serverDir, "crash-reports");
    if (existsSync(crDir)) {
      const cr = await readdir(crDir);
      if (cr.length > 0) {
        cr.sort();
        const last = cr[cr.length - 1];
        const reportPath = join(crDir, last);
        const crStat = await stat(reportPath);
        const logStat = await stat(logPath);
        if (crStat.mtimeMs >= logStat.mtimeMs - 60000) {
          const report = await readFile(reportPath, "utf-8");
          return { lines: report.split("\n").filter(Boolean).slice(0, 50), crashReport: report };
        }
      }
    }

    const filtered = allLines.filter(l => /ERROR|FATAL|Exception in thread|Encountered an unexpected exception|FAILED TO BIND|Address already in use|You need to agree to the EULA/i.test(l));
    if (filtered.length > 0) {
      return { lines: filtered };
    }
  } catch {
    return { lines: [] };
  }

  return { lines: [] };
}

export async function inspectServerDirectory(this: MinecraftService, targetPath: string) {
  const resolvedPath = resolve(targetPath);
  const folderName = basename(resolvedPath);

  if (!existsSync(resolvedPath)) {
    return {
      isValid: false,
      serverDir: resolvedPath,
      folderName,
      hasProperties: false,
      hasWorld: false,
      hasEula: false,
      eulaAccepted: false,
      hasJar: false,
      jarFiles: [],
      detectedEngine: "vanilla" as const,
      properties: {},
      error: "Directory does not exist",
    };
  }

  try {
    const s = await stat(resolvedPath);
    if (!s.isDirectory()) {
      return {
        isValid: false,
        serverDir: resolvedPath,
        folderName,
        hasProperties: false,
        hasWorld: false,
        hasEula: false,
        eulaAccepted: false,
        hasJar: false,
        jarFiles: [],
        detectedEngine: "vanilla" as const,
        properties: {},
        error: "Path is not a directory",
      };
    }

    const files = await readdir(resolvedPath);
    const jarFiles = files.filter(f => f.endsWith(".jar"));
    const hasProperties = files.includes("server.properties");
    const hasEula = files.includes("eula.txt");
    
    let eulaAccepted = false;
    if (hasEula) {
      try {
        const eulaContent = await readFile(join(resolvedPath, "eula.txt"), "utf-8");
        eulaAccepted = /eula\s*=\s*true/i.test(eulaContent);
      } catch {}
    }

    const properties: Record<string, string> = {};
    if (hasProperties) {
      try {
        const content = await readFile(join(resolvedPath, "server.properties"), "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx > -1) {
            properties[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
          }
        }
      } catch {}
    }

    const levelName = properties["level-name"] || "world";
    const hasWorld = files.includes(levelName) || files.includes("world");

    let detectedEngine: "vanilla" | "fabric" = "vanilla";
    if (jarFiles.some(j => j.toLowerCase().includes("fabric")) || files.includes(".fabric")) {
      detectedEngine = "fabric";
    }

    let detectedVersion: string | undefined = undefined;
    // Try to read version from logs
    if (files.includes("logs")) {
      try {
        const logPath = join(resolvedPath, "logs", "latest.log");
        if (existsSync(logPath)) {
          const logHead = (await readFile(logPath, "utf-8")).slice(0, 10000);
          const vMatch = logHead.match(/Starting minecraft server version ([\w\.-]+)/i) ||
                         logHead.match(/Loading Minecraft ([\w\.-]+)/i) ||
                         logHead.match(/Minecraft Server (\d+\.\d+(\.\d+)?)/i);
          if (vMatch) {
            detectedVersion = vMatch[1];
          }
        }
      } catch {}
    }

    // Check jar filenames for version hint (e.g. paper-1.21.1-123.jar or server-1.21.jar)
    if (!detectedVersion) {
      for (const j of jarFiles) {
        const match = j.match(/(\d+\.\d+(\.\d+)?)/);
        if (match) {
          detectedVersion = match[1];
          break;
        }
      }
    }

    const detectedDisplayName = properties["server-name"] || (properties["motd"] ? properties["motd"].replace(/^A Minecraft Server:\s*/i, "") : folderName);

    return {
      isValid: true,
      serverDir: resolvedPath,
      folderName,
      hasProperties,
      hasWorld,
      hasEula,
      eulaAccepted,
      hasJar: jarFiles.length > 0,
      jarFiles,
      detectedEngine,
      detectedVersion,
      detectedDisplayName,
      properties,
    };
  } catch (err: any) {
    return {
      isValid: false,
      serverDir: resolvedPath,
      folderName,
      hasProperties: false,
      hasWorld: false,
      hasEula: false,
      eulaAccepted: false,
      hasJar: false,
      jarFiles: [],
      detectedEngine: "vanilla" as const,
      properties: {},
      error: err.message || "Failed to inspect directory",
    };
  }
}

export async function scanUnregisteredServers(this: MinecraftService) {
  await mkdir(BASE_DIR, { recursive: true });
  const registeredServers = this.listServers();
  const registeredDirs = new Set(registeredServers.map(s => resolve(s.serverDir)));
  const registeredSlugs = new Set(registeredServers.map(s => s.slug));

  const entries = await readdir(BASE_DIR);
  const unlinked: Array<{
    serverDir: string;
    folderName: string;
    suggestedSlug: string;
    inspection: Awaited<ReturnType<typeof inspectServerDirectory>>;
  }> = [];

  for (const entry of entries) {
    const fullPath = resolve(join(BASE_DIR, entry));
    if (registeredDirs.has(fullPath)) continue;

    try {
      const s = await stat(fullPath);
      if (!s.isDirectory()) continue;

      const inspection = await this.inspectServerDirectory(fullPath);
      if (!inspection.isValid) continue;

      const suggestedSlug = entry.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32);

      unlinked.push({
        serverDir: fullPath,
        folderName: entry,
        suggestedSlug: registeredSlugs.has(suggestedSlug) ? `${suggestedSlug}-${Date.now().toString().slice(-4)}` : suggestedSlug,
        inspection,
      });
    } catch {}
  }

  return unlinked;
}

export async function importServer(this: MinecraftService, data: {
  slug: string;
  displayName: string;
  engine: string;
  mcVersion: string;
  serverDir: string;
  javaArgs?: string;
}) {
  validateSlug(data.slug);
  const existing = this.getServer(data.slug);
  if (existing) {
    throw new Error(`A server with slug "${data.slug}" already exists`);
  }

  const resolvedDir = resolve(data.serverDir);
  if (!existsSync(resolvedDir)) {
    throw new Error(`Server directory "${resolvedDir}" does not exist`);
  }

  const s = await stat(resolvedDir);
  if (!s.isDirectory()) {
    throw new Error(`Server directory "${resolvedDir}" is not a directory`);
  }

  // Ensure eula is accepted
  const eulaPath = join(resolvedDir, "eula.txt");
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

  // Ensure standard subdirectories
  await mkdir(join(resolvedDir, "mods"), { recursive: true });
  await mkdir(join(resolvedDir, "resourcepacks"), { recursive: true });
  await mkdir(join(resolvedDir, "logs"), { recursive: true });
  await mkdir(join(resolvedDir, "world"), { recursive: true });
  await this.ensureDatapacksDir(resolvedDir);

  db.insert(mc_servers).values({
    slug: data.slug,
    displayName: data.displayName,
    engine: data.engine,
    mcVersion: data.mcVersion,
    javaArgs: data.javaArgs || null,
    serverDir: resolvedDir,
  }).run();

  return this.getServer(data.slug);
}
