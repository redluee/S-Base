import { request, uploadFormDataWithProgress } from "./core";
import type {
  Measurement,
} from "./types";

export const measurementsApi = {
  list: () =>
    request<Measurement[]>("/measurements"),
  latest: () =>
    request<Measurement | null>("/measurements/latest"),
  save: (data: Partial<Measurement>) =>
    request<Measurement>("/measurements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Measurement>) =>
    request<Measurement>(`/measurements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/measurements/${id}`, {
      method: "DELETE",
    }),
  uploadPhoto: async (file: File | Blob, fileName?: string, onProgress?: (progress: number) => void) => {
    return uploadFormDataWithProgress<{ filePath: string }>(
      "/api/measurements/upload",
      file,
      fileName,
      onProgress
    );
  },
  deletePhoto: (photoId: number) =>
    request<{ success: boolean }>(`/measurements/photos/${photoId}`, {
      method: "DELETE",
    }),
};
