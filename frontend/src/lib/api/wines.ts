import { request, uploadFormDataWithProgress } from "./core";
import type {
  Wine,
} from "./types";

export const winesApi = {
  list: (type?: string, q?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    const qs = params.toString();
    return request<Wine[]>(`/wines${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => request<Wine>(`/wines/${id}`),
  create: (data: unknown) =>
    request<Wine>("/wines", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: unknown) =>
    request<Wine>(`/wines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/wines/${id}`, { method: "DELETE" }),
  uploadPhoto: async (file: File | Blob, fileName?: string, onProgress?: (progress: number) => void) => {
    return uploadFormDataWithProgress<{ filePath: string }>(
      "/api/wines/upload",
      file,
      fileName,
      onProgress
    );
  },
};
