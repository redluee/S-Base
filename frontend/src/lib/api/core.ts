import { compressImage } from "../image";

export class ApiError extends Error {
  status: number;
  data?: Record<string, unknown>;
  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
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
    let message = res.statusText;
    let data: Record<string, unknown> | undefined;
    try {
      const text = await res.clone().text();
      try {
        const json = JSON.parse(text);
        message = json.error || message;
        if (json && typeof json === "object" && !Array.isArray(json)) data = json;
      } catch {
        message = text || message;
      }
    } catch {
      // fallback if cloning/text reading fails
    }
    throw new ApiError(message, res.status, data);
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
        reject(new Error(xhr.statusText || `Upload failed with status ${xhr.status}`));
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
