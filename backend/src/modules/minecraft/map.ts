import { join, resolve } from "path";
import { existsSync, readdirSync } from "fs";
import { readFile, stat } from "fs/promises";
import { validateSlug } from "./validation";
import { MIME_TYPES } from "./mime";
import type { MinecraftService } from "./index";

export function getMapWebDir(this: MinecraftService, serverDir: string): string | null {
  const candidates = [
    join(serverDir, "config", "pl3xmap", "web"),
    join(serverDir, "config", "Pl3xMap", "web"),
    join(serverDir, "plugins", "Pl3xMap", "web"),
    join(serverDir, "plugins", "pl3xmap", "web"),
    join(serverDir, "pl3xmap", "web"),
    join(serverDir, "web"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      return c;
    }
  }
  return null;
}

export function hasMapMod(this: MinecraftService, serverDir: string): boolean {
  if (this.getMapWebDir(serverDir) !== null) return true;
  if (existsSync(join(serverDir, "config", "pl3xmap")) || existsSync(join(serverDir, "config", "Pl3xMap"))) return true;
  if (existsSync(join(serverDir, "plugins", "Pl3xMap")) || existsSync(join(serverDir, "plugins", "pl3xmap"))) return true;

  try {
    const modsDir = join(serverDir, "mods");
    if (existsSync(modsDir)) {
      const modFiles = readdirSync(modsDir);
      if (modFiles.some((f) => f.toLowerCase().includes("pl3x"))) {
        return true;
      }
    }
  } catch {}

  try {
    const pluginsDir = join(serverDir, "plugins");
    if (existsSync(pluginsDir)) {
      const pluginFiles = readdirSync(pluginsDir);
      if (pluginFiles.some((f) => f.toLowerCase().includes("pl3x"))) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function getMapStatus(this: MinecraftService, slug: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  const hasMap = this.hasMapMod(server.serverDir);
  const webDir = this.getMapWebDir(server.serverDir);
  const webExists = webDir !== null && existsSync(join(webDir, "index.html"));
  return { hasMap, webExists };
}

export async function serveMapFile(this: MinecraftService, slug: string, subpath: string): Promise<{
  data?: Buffer | Uint8Array;
  contentType?: string;
  contentEncoding?: string;
  headers?: Record<string, string>;
  status?: number;
  notFound?: boolean;
}> {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) return { notFound: true };

  const webDir = this.getMapWebDir(server.serverDir);
  if (!webDir || !existsSync(webDir)) {
    return { notFound: true };
  }

  const resolvedWebDir = resolve(webDir);
  let cleanSubpath = (subpath || "").replace(/^\/+/, "");
  if (!cleanSubpath || cleanSubpath === "") {
    cleanSubpath = "index.html";
  }

  let targetFile = resolve(resolvedWebDir, cleanSubpath);
  if (!targetFile.startsWith(resolvedWebDir)) {
    return { status: 403 };
  }

  if (existsSync(targetFile)) {
    try {
      const s = await stat(targetFile);
      if (s.isDirectory()) {
        targetFile = join(targetFile, "index.html");
        if (!existsSync(targetFile)) {
          return { notFound: true };
        }
      }
    } catch {
      return { notFound: true };
    }
  } else {
    return { notFound: true };
  }

  try {
    let data = await readFile(targetFile);
    const isGzip = targetFile.endsWith(".gz");
    let contentType = "application/octet-stream";
    let contentEncoding: string | undefined = undefined;

    if (isGzip) {
      contentEncoding = "gzip";
      if (targetFile.endsWith(".pl3xmap.gz")) {
        contentType = "application/octet-stream";
      } else {
        contentType = "application/json; charset=utf-8";
      }
    } else {
      const ext = targetFile.slice(targetFile.lastIndexOf(".")).toLowerCase();
      contentType = MIME_TYPES[ext] || "application/octet-stream";
    }

    if (cleanSubpath.endsWith("index.html") && contentType.includes("text/html")) {
      const htmlStr = data.toString("utf-8");
      if (!htmlStr.includes("<base ")) {
        const withBase = htmlStr.replace(
          /<head([^>]*)>/i,
          `<head$1>\n    <base href="/api/minecraft/servers/${slug}/map/">`
        );
        data = Buffer.from(withBase, "utf-8");
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (contentEncoding) {
      headers["Content-Encoding"] = contentEncoding;
    }
    if (cleanSubpath.endsWith(".html") || cleanSubpath.endsWith(".json")) {
      headers["Cache-Control"] = "no-cache";
    } else {
      headers["Cache-Control"] = "public, max-age=3600";
    }

    return { data, contentType, contentEncoding, headers, status: 200 };
  } catch {
    return { notFound: true };
  }
}
