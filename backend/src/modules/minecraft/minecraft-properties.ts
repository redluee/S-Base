import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { ValidationError } from "../../utils/errors";
import type { MinecraftParts } from "./minecraft-parts";

function parseLine(line: string): [string, string] | null {
  if (line.trim().startsWith("#") || !line.trim()) return null;
  const idx = line.indexOf("=");
  if (idx < 0) return null;
  return [line.substring(0, idx).trim(), line.substring(idx + 1).trim()];
}

export class MinecraftProperties {
  constructor(private readonly parts: MinecraftParts) {}

  async read(slug: string) {
    const server = this.parts.servers.get(slug);
    const props: Record<string, string> = {};
    try {
      const content = await readFile(join(server.serverDir, "server.properties"), "utf-8");
      for (const line of content.split("\n")) {
        const entry = parseLine(line);
        if (entry) props[entry[0]] = entry[1];
      }
    } catch {
      return {};
    }
    return props;
  }

  async update(slug: string, props: Record<string, string>) {
    await this.write(slug, props);
    return { ok: true };
  }

  async write(slug: string, props: Record<string, string>, srvDir?: string) {
    for (const [key, value] of Object.entries(props)) {
      if (!key.trim() || /[=\r\n]/.test(key) || /[\r\n]/.test(value)) {
        throw new ValidationError("minecraft.invalidProperty", { property: key });
      }
    }
    const serverDir = srvDir || this.parts.servers.get(slug).serverDir;

    let existingLines: string[] = [];
    try {
      existingLines = (await readFile(join(serverDir, "server.properties"), "utf-8")).split("\n");
    } catch {
      existingLines = [];
    }

    const pending = { ...props };
    const outLines: string[] = [];
    for (const line of existingLines) {
      const entry = parseLine(line);
      if (entry && entry[0] in pending) {
        outLines.push(`${entry[0]}=${pending[entry[0]]}`);
        delete pending[entry[0]];
      } else {
        outLines.push(line);
      }
    }
    for (const [k, v] of Object.entries(pending)) {
      outLines.push(`${k}=${v}`);
    }

    await writeFile(join(serverDir, "server.properties"), outLines.join("\n"));

    if (this.parts.lifecycle.isRunning(slug)) {
      await this.applyLive(slug, props);
    }
  }

  private async applyLive(slug: string, props: Record<string, string>) {
    const send = (cmd: string) => this.parts.lifecycle.sendCommand(slug, cmd);
    if (props.difficulty) await send(`difficulty ${props.difficulty}`);
    if (props.gamemode) await send(`defaultgamemode ${props.gamemode}`);
    if (props["white-list"] !== undefined) {
      const mode = props["white-list"] === "true" ? "on" : "off";
      await send(`whitelist ${mode}`);
      if (mode === "on") await send("whitelist reload");
    }
    if (props["player-idle-timeout"] !== undefined) {
      await send(`setidletimeout ${props["player-idle-timeout"] || "0"}`);
    }
    if (props["do-fire-tick"] !== undefined || props.doFireTick !== undefined) {
      const val = props["do-fire-tick"] ?? props.doFireTick;
      await send(`gamerule doFireTick ${val === "false" ? "false" : "true"}`);
    }
  }

  defaults(serverName: string, seed?: string) {
    const p: Record<string, string> = {
      "server-name": serverName,
      motd: `A Minecraft Server: ${serverName}`,
      "enforce-secure-profile": "false",
    };
    if (seed) p["level-seed"] = seed;
    return p;
  }
}
