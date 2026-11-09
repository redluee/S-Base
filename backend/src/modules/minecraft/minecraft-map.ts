import { existsSync, readdirSync } from "fs";
import { readFile, stat } from "fs/promises";
import { join, resolve, sep } from "path";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { MIME_TYPES } from "./mime";
import type { MinecraftParts } from "./minecraft-parts";

export interface MapFile {
  data: Buffer;
  contentType: string;
  contentEncoding?: string;
  headers: Record<string, string>;
  status: number;
}

function anyFileContains(dir: string, needle: string): boolean {
  try {
    return existsSync(dir) && readdirSync(dir).some((f) => f.toLowerCase().includes(needle));
  } catch {
    return false;
  }
}

export class MinecraftMap {
  constructor(private readonly parts: MinecraftParts) {}

  getWebDir(serverDir: string): string | null {
    const candidates = [
      join(serverDir, "config", "pl3xmap", "web"),
      join(serverDir, "config", "Pl3xMap", "web"),
      join(serverDir, "plugins", "Pl3xMap", "web"),
      join(serverDir, "plugins", "pl3xmap", "web"),
      join(serverDir, "pl3xmap", "web"),
      join(serverDir, "web"),
    ];
    return candidates.find((c) => existsSync(c)) ?? null;
  }

  hasMapMod(serverDir: string): boolean {
    if (this.getWebDir(serverDir) !== null) return true;
    const known = [
      join(serverDir, "config", "pl3xmap"),
      join(serverDir, "config", "Pl3xMap"),
      join(serverDir, "plugins", "Pl3xMap"),
      join(serverDir, "plugins", "pl3xmap"),
    ];
    if (known.some((p) => existsSync(p))) return true;
    return anyFileContains(join(serverDir, "mods"), "pl3x") || anyFileContains(join(serverDir, "plugins"), "pl3x");
  }

  status(slug: string) {
    const server = this.parts.servers.get(slug);
    const webDir = this.getWebDir(server.serverDir);
    return {
      hasMap: this.hasMapMod(server.serverDir),
      webExists: webDir !== null && existsSync(join(webDir, "index.html")),
    };
  }

  async serve(slug: string, subpath: string): Promise<MapFile> {
    const server = this.parts.servers.get(slug);
    const webDir = this.getWebDir(server.serverDir);
    if (!webDir) throw new NotFoundError("minecraft.mapNotFound");

    const resolvedWebDir = resolve(webDir);
    const cleanSubpath = (subpath || "").replace(/^\/+/, "") || "index.html";

    let targetFile = resolve(resolvedWebDir, cleanSubpath);
    if (targetFile !== resolvedWebDir && !targetFile.startsWith(resolvedWebDir + sep))
      throw new ValidationError("minecraft.invalidPath");

    try {
      if ((await stat(targetFile)).isDirectory()) targetFile = join(targetFile, "index.html");
      let data = await readFile(targetFile);
      const isGzip = targetFile.endsWith(".gz");
      let contentType = "application/octet-stream";
      if (isGzip) {
        contentType = targetFile.endsWith(".pl3xmap.gz")
          ? "application/octet-stream"
          : "application/json; charset=utf-8";
      } else {
        const ext = targetFile.slice(targetFile.lastIndexOf(".")).toLowerCase();
        contentType = MIME_TYPES[ext] || "application/octet-stream";
      }

      if (cleanSubpath.endsWith("index.html") && contentType.includes("text/html")) {
        const html = data.toString("utf-8");
        if (!html.includes("<base ")) {
          data = Buffer.from(
            html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="/api/minecraft/servers/${slug}/map/">`),
            "utf-8",
          );
        }
      }

      const headers: Record<string, string> = { "Content-Type": contentType };
      if (isGzip) headers["Content-Encoding"] = "gzip";
      headers["Cache-Control"] =
        cleanSubpath.endsWith(".html") || cleanSubpath.endsWith(".json") ? "no-cache" : "public, max-age=3600";

      return { data, contentType, contentEncoding: isGzip ? "gzip" : undefined, headers, status: 200 };
    } catch {
      throw new NotFoundError("minecraft.mapNotFound");
    }
  }
}
