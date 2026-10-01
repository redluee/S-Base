import { basename } from "path";
import { ValidationError } from "./validation";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "bmp"];
export const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md"];
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
export const MEASUREMENT_PHOTO_PATTERN = new RegExp(`^/api/uploads/(measurement_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:${IMAGE_EXTENSIONS.join("|")}))$`, "i");

export function resolveUploadExtension(file: { name?: string; size?: number } | null | undefined, allowed: string[], maxBytes = 25 * 1024 * 1024): string {
  if (!file || typeof file !== "object" || typeof (file as any).arrayBuffer !== "function") {
    throw new ValidationError("No file uploaded");
  }
  if (typeof file.size === "number" && file.size > maxBytes) throw new ValidationError("File too large");
  const name = typeof file.name === "string" ? basename(file.name) : "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (!allowed.includes(ext)) throw new ValidationError(`File type not allowed. Allowed: ${allowed.join(", ")}`);
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
