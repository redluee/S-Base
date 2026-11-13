import { join } from "path";

export const DEFAULT_LEVEL_NAME = "world";
export const SERVER_SUBDIRS = ["mods", "resourcepacks", "logs", DEFAULT_LEVEL_NAME] as const;

export function tmuxSession(slug: string): string {
  return `mc-${slug}`;
}

export function latestLogPath(serverDir: string): string {
  return join(serverDir, "logs", "latest.log");
}

export function bannedPlayersPath(serverDir: string): string {
  return join(serverDir, "banned-players.json");
}

export function propertiesPath(serverDir: string): string {
  return join(serverDir, "server.properties");
}

export function eulaPath(serverDir: string): string {
  return join(serverDir, "eula.txt");
}
