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

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(text);
    return json && typeof json === "object" && !Array.isArray(json) ? json : null;
  } catch {
    return null;
  }
}

export function errorFromBody(status: number, statusText: string, text: string): ApiError {
  const json = parseJsonObject(text);
  if (json) return new ApiError(typeof json.error === "string" ? json.error : statusText, status, json);
  return new ApiError(text || statusText, status);
}

export type Fetcher = <T>(path: string, init?: RequestInit) => Promise<T>;

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

export async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", body, credentials: "include" });
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
  path: string,
  file: File | Blob,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api${path}`, true);
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
          reject(new ApiError("upload.invalidResponse", xhr.status));
        }
      } else {
        reject(errorFromBody(xhr.status, xhr.statusText || `Upload failed with status ${xhr.status}`, xhr.responseText));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError("upload.networkError", 0));
    };

    const formData = new FormData();
    // The backend trusts the extension and serves uploads with a matching
    // Content-Type + nosniff, so the name must follow the actual (possibly
    // re-encoded) bytes rather than the original filename.
    const baseName = fileName || (file as File).name || "upload";
    const nameWithoutExt = baseName.replace(/\.[^./]+$/, "") || "upload";
    const ext = MIME_TYPE_EXTENSIONS[file.type] ?? baseName.split(".").pop() ?? "jpg";
    const name = `${nameWithoutExt}.${ext}`;
    formData.append("file", file, name);
    xhr.send(formData);
  });
}
