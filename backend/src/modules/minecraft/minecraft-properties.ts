import { readFile, writeFile } from "fs/promises";
import { defaultMotd, liveCommands } from "../../shared/minecraft";
import { ValidationError } from "../../utils/errors";
import type { MinecraftService } from "./index";
import { propertiesPath } from "./server-layout";
import { mergeProperties, readPropertiesFile } from "./server-properties";

export class MinecraftProperties {
  constructor(private readonly parts: Pick<MinecraftService, "lifecycle" | "servers">) {}

  read(slug: string) {
    return readPropertiesFile(this.parts.servers.get(slug).serverDir);
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
    const path = propertiesPath(srvDir || this.parts.servers.get(slug).serverDir);
    const existing = await readFile(path, "utf-8").catch(() => "");
    await writeFile(path, mergeProperties(existing, props));

    if (this.parts.lifecycle.isRunning(slug)) {
      await this.applyLive(slug, props);
    }
  }

  private async applyLive(slug: string, props: Record<string, string>) {
    for (const command of liveCommands(props)) await this.parts.lifecycle.sendCommand(slug, command);
  }

  defaults(serverName: string) {
    return {
      "server-name": serverName,
      motd: defaultMotd(serverName),
      "enforce-secure-profile": "false",
    };
  }
}
