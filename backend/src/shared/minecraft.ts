export const FOLDER_TYPES = ["mods", "datapacks", "resourcepacks"] as const;
export type FolderType = (typeof FOLDER_TYPES)[number];

export const ENGINES = ["vanilla", "fabric"] as const;
export type Engine = (typeof ENGINES)[number];

export const UPLOAD_EXTENSIONS: readonly string[] = ["jar", "zip"];
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

export const SLUG_MAX_LENGTH = 32;
export const SLUG_PATTERN = `^[a-z0-9-]{3,${SLUG_MAX_LENGTH}}$`;

export function isValidSlug(slug: string): boolean {
  return new RegExp(SLUG_PATTERN).test(slug);
}

export function toServerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, SLUG_MAX_LENGTH);
}

export const AIKAR_FLAGS: readonly string[] = [
  "-XX:+UseG1GC",
  "-XX:+ParallelRefProcEnabled",
  "-XX:MaxGCPauseMillis=200",
  "-XX:+UnlockExperimentalVMOptions",
  "-XX:+DisableExplicitGC",
  "-XX:+AlwaysPreTouch",
  "-XX:G1NewSizePercent=30",
  "-XX:G1MaxNewSizePercent=40",
  "-XX:G1ReservePercent=20",
  "-XX:G1HeapWastePercent=5",
  "-XX:G1MixedGCCountTarget=4",
  "-XX:InitiatingHeapOccupancyPercent=15",
  "-XX:G1MixedGCLiveThresholdPercent=90",
  "-XX:G1RSetUpdatingPauseTimePercent=5",
  "-XX:SurvivorRatio=32",
  "-XX:+PerfDisableSharedMem",
  "-XX:MaxTenuringThreshold=1",
  "-Dusing.aikars.flags=https://mcflags.emc.gs",
  "-Daikars.new.flags=true",
];

export const ZGC_FLAGS: readonly string[] = ["-XX:+UseZGC", "-XX:+ZGenerational", "-XX:+AlwaysPreTouch"];

export const DEFAULT_MEMORY = "2G";
export const DEFAULT_MIN_MEMORY = "512M";
export const DEFAULT_JAVA_ARGS = `-Xms${DEFAULT_MEMORY} -Xmx${DEFAULT_MEMORY}`;

export const VANILLA_JAR = "server.jar";
export const FABRIC_LAUNCH_JAR = "fabric-server-launch.jar";

export const DEFAULT_SERVER_PORT = 25565;
export const DEFAULT_MOTD_PREFIX = "A Minecraft Server";

export function defaultMotd(serverName: string): string {
  return `${DEFAULT_MOTD_PREFIX}: ${serverName}`;
}

export const LIVE_PROPERTIES: readonly string[] = [
  "difficulty",
  "gamemode",
  "white-list",
  "player-idle-timeout",
  "do-fire-tick",
  "doFireTick",
];

export function liveCommands(props: Record<string, string>): string[] {
  const commands: string[] = [];
  if (props.difficulty) commands.push(`difficulty ${props.difficulty}`);
  if (props.gamemode) commands.push(`defaultgamemode ${props.gamemode}`);
  if (props["white-list"] !== undefined) {
    const mode = props["white-list"] === "true" ? "on" : "off";
    commands.push(`whitelist ${mode}`);
    if (mode === "on") commands.push("whitelist reload");
  }
  if (props["player-idle-timeout"] !== undefined) {
    commands.push(`setidletimeout ${props["player-idle-timeout"] || "0"}`);
  }
  const fireTick = props["do-fire-tick"] ?? props.doFireTick;
  if (fireTick !== undefined) commands.push(`gamerule doFireTick ${fireTick === "false" ? "false" : "true"}`);
  return commands;
}
