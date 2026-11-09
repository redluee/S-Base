import { compressImage } from "../image";
import { t } from "../lang";

export class ApiError extends Error {
  status: number;
  key: string;
  data?: Record<string, unknown>;
  constructor(key: string, status: number, data?: Record<string, unknown>) {
    super(translateErrorKey(key, data));
    this.name = "ApiError";
    this.key = key;
    this.status = status;
    this.data = data;
  }
}

function translateErrorKey(key: string, data?: Record<string, unknown>): string {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (k !== "error") params[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return t(key, params);
}

export function apiErrorMessage(error: unknown, fallbackKey: string): string {
  return error instanceof ApiError ? error.message : t(fallbackKey);
}

function errorFromBody(status: number, statusText: string, text: string): ApiError {
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return new ApiError(typeof json.error === "string" ? json.error : statusText, status, json);
    }
  } catch {
    // body was not JSON
  }
  return new ApiError(text || statusText, status);
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw errorFromBody(res.status, res.statusText, text);
  }
  return res.json();
}

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function uploadFormDataWithProgress<T>(
  url: string,
  file: File | Blob,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<T> {
  const compressedFile = await compressImage(file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        reject(errorFromBody(xhr.status, xhr.statusText || `Upload failed with status ${xhr.status}`, xhr.responseText));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    const formData = new FormData();
    // compressImage may re-encode to a different format (e.g. JPEG), so the
    // extension must match the actual bytes being uploaded, not the original
    // filename - the backend trusts the extension and serves it with a
    // matching Content-Type + nosniff, so a mismatch breaks rendering.
    const baseName = fileName || (compressedFile as File).name || (file as File).name || "upload";
    const nameWithoutExt = baseName.replace(/\.[^./]+$/, "") || "upload";
    const ext = MIME_TYPE_EXTENSIONS[compressedFile.type] ?? baseName.split(".").pop() ?? "jpg";
    const name = `${nameWithoutExt}.${ext}`;
    formData.append("file", compressedFile, name);
    xhr.send(formData);
  });
}
