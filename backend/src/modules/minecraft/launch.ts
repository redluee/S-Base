import { existsSync } from "fs";
import { join } from "path";
import {
  AIKAR_FLAGS,
  DEFAULT_MEMORY,
  DEFAULT_MIN_MEMORY,
  FABRIC_LAUNCH_JAR,
  VANILLA_JAR,
} from "../../shared/minecraft";

export function parseJavaArgs(rawArgs?: string | null): string[] {
  const trimmed = rawArgs?.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {}
  }
  return trimmed
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function memoryFlags(args: string[]): string[] {
  const hasXmx = args.some((a) => /^-Xmx/i.test(a));
  const hasXms = args.some((a) => /^-Xms/i.test(a));
  if (!hasXms && !hasXmx) return [`-Xms${DEFAULT_MEMORY}`, `-Xmx${DEFAULT_MEMORY}`];
  return [...(hasXms ? [] : [`-Xms${DEFAULT_MIN_MEMORY}`]), ...(hasXmx ? [] : [`-Xmx${DEFAULT_MEMORY}`])];
}

export function formatJavaLaunchCommand(engine: string, serverDir: string, rawJavaArgs?: string | null): string {
  const parsedArgs = parseJavaArgs(rawJavaArgs);
  const gcFlags = rawJavaArgs?.trim() ? [] : AIKAR_FLAGS;
  const fullArgs = [...memoryFlags(parsedArgs), ...parsedArgs, ...gcFlags];
  const jarFile =
    engine === "fabric" && existsSync(join(serverDir, FABRIC_LAUNCH_JAR)) ? FABRIC_LAUNCH_JAR : VANILLA_JAR;
  return `java ${fullArgs.join(" ")} -jar ${jarFile} nogui`.replace(/\s+/g, " ").trim();
}
