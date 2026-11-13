import {
  ENGINES,
  type Engine,
  FOLDER_TYPES,
  type FolderType,
  isValidSlug,
  UPLOAD_EXTENSIONS,
} from "../../shared/minecraft";
import { ValidationError } from "../../utils/errors";

export function validateSlug(slug: string): void {
  if (!isValidSlug(slug)) throw new ValidationError("minecraft.invalidSlug");
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
  return cmd
    .replace(/[\r\n;`$&|<>]/g, "")
    .trim()
    .slice(0, 512);
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
