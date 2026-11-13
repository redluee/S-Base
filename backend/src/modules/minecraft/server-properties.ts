import { readFile } from "fs/promises";
import { propertiesPath } from "./server-layout";

function parseLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx < 0) return null;
  return [trimmed.substring(0, idx).trim(), trimmed.substring(idx + 1).trim()];
}

export function parseProperties(content: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const entry = parseLine(line);
    if (entry) props[entry[0]] = entry[1];
  }
  return props;
}

export function mergeProperties(content: string, props: Record<string, string>): string {
  const pending = { ...props };
  const out = (content ? content.split("\n") : []).map((line) => {
    const entry = parseLine(line);
    if (!entry || !(entry[0] in pending)) return line;
    const value = pending[entry[0]];
    delete pending[entry[0]];
    return `${entry[0]}=${value}`;
  });
  for (const [key, value] of Object.entries(pending)) out.push(`${key}=${value}`);
  return out.join("\n");
}

export async function readPropertiesFile(serverDir: string): Promise<Record<string, string>> {
  try {
    return parseProperties(await readFile(propertiesPath(serverDir), "utf-8"));
  } catch {
    return {};
  }
}
