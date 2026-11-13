import { mkdir, rm } from "fs/promises";
import { basename, join } from "path";
import { UPLOADS_DIR } from "../db/paths";
import { ValidationError } from "./errors";

export const UPLOAD_PREFIXES = {
  cashflow: "cashflow_",
  minor: "minor_",
  recipes: "wine_",
  resume: "resume_",
  workout: "measurement_",
} as const;

export type UploadOwner = keyof typeof UPLOAD_PREFIXES;

const UPLOAD_URL_PREFIX = "/api/uploads/";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "bmp"];
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md"];
export const DOWNLOAD_ONLY_EXTENSIONS = ["zip", "mp4", "mov", "webm", "mp3", "m4a", "odt", "ods", "odp", "rtf", "json"];
export const ATTACHMENT_EXTENSIONS = [...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS, ...DOWNLOAD_ONLY_EXTENSIONS];

const INLINE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  bmp: "image/bmp",
  pdf: "application/pdf",
};

export const UPLOAD_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,100}\.[A-Za-z0-9]{1,5}$/;

export function uploadUrl(filename: string): string {
  return `${UPLOAD_URL_PREFIX}${filename}`;
}

export function uploadFilenameOf(url: string): string | null {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const filename = url.slice(UPLOAD_URL_PREFIX.length);
  return UPLOAD_NAME_PATTERN.test(filename) ? filename : null;
}

export function uploadPath(filename: string): string {
  return join(UPLOADS_DIR, filename);
}

export function uploadOwnerOf(filename: string): UploadOwner | null {
  const entry = Object.entries(UPLOAD_PREFIXES).find(([, prefix]) => filename.startsWith(prefix));
  return entry ? (entry[0] as UploadOwner) : null;
}

export async function saveUpload(body: unknown, owner: UploadOwner, allowed: string[], maxBytes?: number) {
  const file = (body as { file?: File } | null | undefined)?.file;
  if (!file) throw new ValidationError("upload.noFile");
  const ext = resolveUploadExtension(file, allowed, maxBytes);
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${UPLOAD_PREFIXES[owner]}${crypto.randomUUID()}.${ext}`;
  await Bun.write(uploadPath(filename), file);
  return {
    filename,
    filePath: uploadUrl(filename),
    originalName: typeof file.name === "string" ? file.name : filename,
  };
}

export async function removeUpload(filename: string): Promise<void> {
  if (UPLOAD_NAME_PATTERN.test(filename)) await rm(uploadPath(filename), { force: true });
}

export function resolveUploadExtension(
  file: { name?: string; size?: number } | null | undefined,
  allowed: string[],
  maxBytes = 25 * 1024 * 1024,
): string {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || typeof file.arrayBuffer !== "function") {
    throw new ValidationError("upload.noFile");
  }
  if (typeof file.size === "number" && file.size > maxBytes) throw new ValidationError("upload.tooLarge");
  const name = typeof file.name === "string" ? basename(file.name) : "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (!allowed.includes(ext)) throw new ValidationError("upload.typeNotAllowed", { allowed });
  return ext;
}

export function uploadResponseHeaders(filename: string): Record<string, string> {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  const inlineType = INLINE_TYPES[ext];
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=300",
  };
  if (ext !== "pdf") {
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'";
  }
  if (inlineType) {
    headers["Content-Type"] = inlineType;
  } else {
    headers["Content-Type"] = "application/octet-stream";
    headers["Content-Disposition"] = "attachment";
  }
  return headers;
}
