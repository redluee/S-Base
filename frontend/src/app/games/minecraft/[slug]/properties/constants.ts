import { LIVE_PROPERTIES } from "@backend/shared/minecraft";

export type TabKey = "all" | "general" | "gameplay" | "world" | "performance" | "custom";

export const LIVE_PROPERTY_SET: ReadonlySet<string> = new Set(LIVE_PROPERTIES);

export const KNOWN_KEYS = new Set([
  "motd",
  "server-port",
  "max-players",
  "online-mode",
  "white-list",
  "enforce-whitelist",
  "hide-online-players",
  "server-ip",
  "enable-status",
  "gamemode",
  "force-gamemode",
  "difficulty",
  "hardcore",
  "pvp",
  "allow-flight",
  "enable-command-block",
  "do-fire-tick",
  "doFireTick",
  "level-name",
  "level-seed",
  "level-type",
  "generate-structures",
  "allow-nether",
  "spawn-monsters",
  "spawn-animals",
  "spawn-npcs",
  "spawn-protection",
  "max-world-size",
  "view-distance",
  "simulation-distance",
  "player-idle-timeout",
  "entity-broadcast-range-percentage",
  "sync-chunk-writes",
  "network-compression-threshold",
]);
