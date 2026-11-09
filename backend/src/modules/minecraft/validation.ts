import { ValidationError } from "../../utils/errors";

export const FOLDER_TYPES = ["mods", "datapacks", "resourcepacks"] as const;
export type FolderType = (typeof FOLDER_TYPES)[number];
export const ENGINES = ["vanilla", "fabric"] as const;
export type Engine = (typeof ENGINES)[number];
export const UPLOAD_EXTENSIONS = ["jar", "zip"];
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

export function validateSlug(slug: string): void {
  if (!/^[a-z0-9-]{3,32}$/.test(slug)) throw new ValidationError("minecraft.invalidSlug");
}

export function validateFolderType(type: string): FolderType {
  if (!(FOLDER_TYPES as readonly string[]).includes(type)) throw new ValidationError("minecraft.invalidFolderType");
  return type as FolderType;
}

export function validateEngine(engine: string): Engine {
  if (!(ENGINES as readonly string[]).includes(engine)) throw new ValidationError("minecraft.unsupportedEngine");
  return engine as Engine;
}

export function sanitizeCommand(cmd: string): string {
  return cmd.replace(/[\r\n;`$&|<>]/g, "").trim().slice(0, 512);
}

export function validateFilename(filename: string): void {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new ValidationError("minecraft.invalidFilename");
  }
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  if (!filename.includes(".") || !UPLOAD_EXTENSIONS.includes(ext)) {
    throw new ValidationError("minecraft.invalidFileExtension");
  }
}

export function requireText(value: string | null | undefined, key: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new ValidationError(key);
  return trimmed;
}
