import { join } from "path";
import { existsSync } from "fs";

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

export const ZGC_FLAGS: readonly string[] = [
  "-XX:+UseZGC",
  "-XX:+ZGenerational",
  "-XX:+AlwaysPreTouch",
];

export const DEFAULT_GC_FLAGS = AIKAR_FLAGS;

export function parseJavaArgs(rawArgs?: string | null): string[] {
  if (!rawArgs) return [];
  const trimmed = rawArgs.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {}
  }
  return trimmed.split(/\s+/).map((x) => x.trim()).filter(Boolean);
}

export function formatJavaLaunchCommand(engine: string, serverDir: string, rawJavaArgs?: string | null): string {
  const parsedArgs = parseJavaArgs(rawJavaArgs);
  const hasXmx = parsedArgs.some((a) => /^-Xmx/i.test(a));
  const hasXms = parsedArgs.some((a) => /^-Xms/i.test(a));

  const memFlags: string[] = [];
  if (!hasXms && !hasXmx) {
    memFlags.push("-Xms2G", "-Xmx2G");
  } else {
    if (!hasXms) memFlags.push("-Xms512M");
    if (!hasXmx) memFlags.push("-Xmx2G");
  }

  const defaultGcFlags = (!rawJavaArgs || !rawJavaArgs.trim()) ? AIKAR_FLAGS : [];

  const fullArgs = [...memFlags, ...parsedArgs, ...defaultGcFlags];
  const hasFabricJar = existsSync(join(serverDir, "fabric-server-launch.jar"));
  const jarFile = engine === "fabric" && hasFabricJar ? "fabric-server-launch.jar" : "server.jar";

  return `java ${fullArgs.join(" ")} -jar ${jarFile} nogui`.replace(/\s+/g, " ").trim();
}
