import { MinecraftDiagnostics } from "./minecraft-diagnostics";
import { MinecraftDirs } from "./minecraft-dirs";
import { MinecraftDownloads } from "./minecraft-downloads";
import { MinecraftFiles } from "./minecraft-files";
import { MinecraftIdle } from "./minecraft-idle";
import { MinecraftImporter } from "./minecraft-importer";
import { MinecraftLifecycle } from "./minecraft-lifecycle";
import { MinecraftMap } from "./minecraft-map";
import type { MinecraftParts } from "./minecraft-parts";
import { MinecraftPlayers } from "./minecraft-players";
import { MinecraftProcesses } from "./minecraft-processes";
import { MinecraftProperties } from "./minecraft-properties";
import { MinecraftServers } from "./minecraft-servers";
import { MinecraftTemplates } from "./minecraft-templates";

export { AIKAR_FLAGS, DEFAULT_GC_FLAGS, formatJavaLaunchCommand, parseJavaArgs, ZGC_FLAGS } from "./launch";
export { DEFAULT_AUTO_SHUTDOWN_MINUTES, DEFAULT_IDLE_CHECK_INTERVAL_MS } from "./minecraft-idle";

export class MinecraftService implements MinecraftParts {
  readonly dirs: MinecraftDirs = new MinecraftDirs();
  readonly processes: MinecraftProcesses = new MinecraftProcesses();
  readonly servers: MinecraftServers = new MinecraftServers(this);
  readonly lifecycle: MinecraftLifecycle = new MinecraftLifecycle(this);
  readonly idle: MinecraftIdle = new MinecraftIdle(this);
  readonly properties: MinecraftProperties = new MinecraftProperties(this);
  readonly files: MinecraftFiles = new MinecraftFiles(this);
  readonly downloads: MinecraftDownloads = new MinecraftDownloads();
  readonly players: MinecraftPlayers = new MinecraftPlayers(this);
  readonly templates: MinecraftTemplates = new MinecraftTemplates(this);
  readonly importer: MinecraftImporter = new MinecraftImporter(this);
  readonly diagnostics: MinecraftDiagnostics = new MinecraftDiagnostics(this);
  readonly map: MinecraftMap = new MinecraftMap(this);

  constructor(autoStartMonitor = process.env.NODE_ENV !== "test") {
    if (autoStartMonitor) this.idle.start();
  }
}
