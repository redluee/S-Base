import type { MinecraftDiagnostics } from "./minecraft-diagnostics";
import type { MinecraftDirs } from "./minecraft-dirs";
import type { MinecraftDownloads } from "./minecraft-downloads";
import type { MinecraftFiles } from "./minecraft-files";
import type { MinecraftIdle } from "./minecraft-idle";
import type { MinecraftImporter } from "./minecraft-importer";
import type { MinecraftLifecycle } from "./minecraft-lifecycle";
import type { MinecraftMap } from "./minecraft-map";
import type { MinecraftPlayers } from "./minecraft-players";
import type { MinecraftProcesses } from "./minecraft-processes";
import type { MinecraftProperties } from "./minecraft-properties";
import type { MinecraftServers } from "./minecraft-servers";
import type { MinecraftTemplates } from "./minecraft-templates";

export interface MinecraftParts {
  readonly dirs: MinecraftDirs;
  readonly processes: MinecraftProcesses;
  readonly servers: MinecraftServers;
  readonly lifecycle: MinecraftLifecycle;
  readonly idle: MinecraftIdle;
  readonly properties: MinecraftProperties;
  readonly files: MinecraftFiles;
  readonly downloads: MinecraftDownloads;
  readonly players: MinecraftPlayers;
  readonly templates: MinecraftTemplates;
  readonly importer: MinecraftImporter;
  readonly diagnostics: MinecraftDiagnostics;
  readonly map: MinecraftMap;
}
