export type TabKey = "all" | "general" | "gameplay" | "world" | "performance" | "custom";

export const LIVE_PROPERTIES = new Set(["difficulty", "gamemode", "white-list", "player-idle-timeout", "do-fire-tick", "doFireTick"]);

export const KNOWN_KEYS = new Set([
  // General
  "motd",
  "server-port",
  "max-players",
  "online-mode",
  "white-list",
  "enforce-whitelist",
  "hide-online-players",
  "server-ip",
  "enable-status",
  // Gameplay
  "gamemode",
  "force-gamemode",
  "difficulty",
  "hardcore",
  "pvp",
  "allow-flight",
  "enable-command-block",
  "do-fire-tick",
  "doFireTick",
  // World
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
  // Performance
  "view-distance",
  "simulation-distance",
  "player-idle-timeout",
  "entity-broadcast-range-percentage",
  "sync-chunk-writes",
  "network-compression-threshold",
]);
