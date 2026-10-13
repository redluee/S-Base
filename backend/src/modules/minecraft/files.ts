import { join } from "path";
import { mkdir, writeFile, readFile, unlink, readdir, copyFile, stat } from "fs/promises";
import { validateSlug, validateFilename } from "./validation";
import type { MinecraftService } from "./index";

export async function readProperties(this: MinecraftService, slug: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  try {
    const content = await readFile(join(server.serverDir, "server.properties"), "utf-8");
    const lines = content.split("\n");
    const props: Record<string, string> = {};
    for (const line of lines) {
      if (line.trim().startsWith("#") || !line.trim()) continue;
      const idx = line.indexOf("=");
      if (idx > -1) {
        props[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    }
    return props;
  } catch {
    return {};
  }
}

export async function writeProperties(this: MinecraftService, slug: string, props: Record<string, string>, srvDir?: string) {
  validateSlug(slug);
  const serverDir = srvDir || this.getServer(slug)?.serverDir;
  if (!serverDir) throw new Error("Server not found");
  
  let existingLines: string[] = [];
  try {
    existingLines = (await readFile(join(serverDir, "server.properties"), "utf-8")).split("\n");
  } catch {
    // not exists
  }
  
  const newProps = { ...props };
  const outLines = [];
  
  for (const line of existingLines) {
    if (line.trim().startsWith("#") || !line.trim()) {
      outLines.push(line);
      continue;
    }
    const idx = line.indexOf("=");
    if (idx > -1) {
      const key = line.substring(0, idx).trim();
      if (key in newProps) {
        outLines.push(`${key}=${newProps[key]}`);
        delete newProps[key];
      } else {
        outLines.push(line);
      }
    } else {
      outLines.push(line);
    }
  }
  
  for (const [k, v] of Object.entries(newProps)) {
    outLines.push(`${k}=${v}`);
  }
  
  await writeFile(join(serverDir, "server.properties"), outLines.join("\n"));

  if (this.isRunning(slug)) {
    if (props.difficulty) {
      await this.sendCommand(slug, `difficulty ${props.difficulty}`);
    }
    if (props.gamemode) {
      await this.sendCommand(slug, `defaultgamemode ${props.gamemode}`);
    }
    if (props["white-list"] !== undefined) {
      const mode = props["white-list"] === "true" ? "on" : "off";
      await this.sendCommand(slug, `whitelist ${mode}`);
      if (mode === "on") {
        await this.sendCommand(slug, "whitelist reload");
      }
    }
    if (props["player-idle-timeout"] !== undefined) {
      await this.sendCommand(slug, `setidletimeout ${props["player-idle-timeout"] || "0"}`);
    }
    if (props["do-fire-tick"] !== undefined || props["doFireTick"] !== undefined) {
      const val = props["do-fire-tick"] ?? props["doFireTick"];
      await this.sendCommand(slug, `gamerule doFireTick ${val === "false" ? "false" : "true"}`);
    }
  }
}

export function generateDefaultProperties(this: MinecraftService, serverName: string, seed?: string) {
  const p: Record<string, string> = {
    "server-name": serverName,
    "motd": `A Minecraft Server: ${serverName}`,
    "enforce-secure-profile": "false"
  };
  if (seed) p["level-seed"] = seed;
  return p;
}

export async function listFiles(this: MinecraftService, slug: string, type: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  try {
    const dirPath = await this.getServerSubdir(server.serverDir, type);
    const files = await readdir(dirPath);
    const results: { name: string; size: number; modified: string }[] = [];
    for (const f of files) {
      try {
        const s = await stat(join(dirPath, f));
        if (s.isFile()) {
          results.push({
            name: f,
            size: s.size,
            modified: s.mtime.toISOString(),
          });
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

export async function uploadFile(this: MinecraftService, slug: string, type: string, filename: string, buffer: ArrayBuffer) {
  validateSlug(slug);
  validateFilename(filename);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  const dirPath = await this.getServerSubdir(server.serverDir, type);
  await writeFile(join(dirPath, filename), Buffer.from(buffer));
  if (type === "datapacks" && this.isRunning(slug)) {
    await this.sendCommand(slug, "reload");
  }
}

export async function deleteFile(this: MinecraftService, slug: string, type: string, filename: string) {
  validateSlug(slug);
  validateFilename(filename);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  const dirPath = await this.getServerSubdir(server.serverDir, type);
  await unlink(join(dirPath, filename)).catch(() => {});
  if (type === "datapacks") {
    await unlink(join(server.serverDir, "datapacks", filename)).catch(() => {});
  }
  if (type === "datapacks" && this.isRunning(slug)) {
    await this.sendCommand(slug, "reload");
  }
}

export async function copyFileFromServer(this: MinecraftService, slug: string, type: string, sourceSlug: string, filename: string) {
  validateSlug(slug);
  validateSlug(sourceSlug);
  validateFilename(filename);
  const target = this.getServer(slug);
  const source = this.getServer(sourceSlug);
  if (!target || !source) throw new Error("Server not found");
  const sourceDir = await this.getServerSubdir(source.serverDir, type);
  const targetDir = await this.getServerSubdir(target.serverDir, type);
  await copyFile(join(sourceDir, filename), join(targetDir, filename));
  if (type === "datapacks" && this.isRunning(slug)) {
    await this.sendCommand(slug, "reload");
  }
}

export async function downloadVanillaJar(this: MinecraftService, mcVersion: string, destDir: string) {
  const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
  const json: any = await res.json();
  const v = json.versions.find((x: any) => x.id === mcVersion);
  if (!v) throw new Error("Version not found");
  const res2 = await fetch(v.url);
  const vjson: any = await res2.json();
  const jarUrl = vjson.downloads.server.url;
  
  const buf = await fetch(jarUrl).then(r => r.arrayBuffer());
  await mkdir(destDir, { recursive: true });
  await writeFile(join(destDir, "server.jar"), Buffer.from(buf));
}

export async function downloadFabricJar(this: MinecraftService, mcVersion: string, destDir: string) {
  const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
  const loaders: any = await res.json();
  if (!Array.isArray(loaders) || loaders.length === 0) {
    throw new Error(`No Fabric loader found for Minecraft version ${mcVersion}`);
  }
  const loader = loaders.find((x: any) => x.loader.stable)?.loader?.version || loaders[0]?.loader?.version;
  if (!loader) throw new Error("Fabric loader not found");
  
  const ires = await fetch("https://meta.fabricmc.net/v2/versions/installer");
  const installers: any = await ires.json();
  const installer = installers.find((x: any) => x.stable)?.url || installers[0]?.url;
  if (!installer) throw new Error("Fabric installer not found");
  
  const buf = await fetch(installer).then(r => r.arrayBuffer());
  await mkdir(destDir, { recursive: true });
  const instJar = join(destDir, "fabric-installer.jar");
  await writeFile(instJar, Buffer.from(buf));
  
  const proc = Bun.spawnSync(["java", "-jar", instJar, "server", "-mcversion", mcVersion, "-loader", loader, "-downloadMinecraft"], { cwd: destDir });
  if (proc.exitCode !== 0) {
    throw new Error(`Fabric installer failed: ${proc.stderr?.toString() || proc.stdout?.toString()}`);
  }
}

export async function listAvailableVersions(this: MinecraftService): Promise<string[]> {
  if (Date.now() - this.versionCacheTime < 3600000 && this.versionCache) {
    return this.versionCache;
  }
  const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
  const json: any = await res.json();
  this.versionCache = (json.versions || [])
    .filter((x: any) => x.type === "release")
    .map((x: any) => x.id);
  this.versionCacheTime = Date.now();
  return this.versionCache || [];
}
