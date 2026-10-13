import { useState } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { compressImage } from "@/lib/image";
import type { Measurement } from "./body-utils";

export function usePhotoUpload(onChanged: () => void, setActionError: (msg: string | null) => void) {
  const fetchLogs = onChanged;
  const [uploadingLogId, setUploadingLogId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "optimizing" | "uploading">("idle");
  const [optimisticPhotoUrl, setOptimisticPhotoUrl] = useState<string | null>(null);

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetLog: Measurement) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let tempUrl: string | null = null;
    setActionError(null);
    try {
      setUploadingLogId(targetLog.measurementId);
      setUploadStage("optimizing");
      setUploadProgress(0);

      // Create instant visual preview
      tempUrl = URL.createObjectURL(file);
      setOptimisticPhotoUrl(tempUrl);

      // Compress client side
      const compressedBlob = await compressImage(file);

      // Upload compressed image
      setUploadStage("uploading");
      const { filePath } = await api.measurements.uploadPhoto(
        compressedBlob,
        file.name,
        (pct) => setUploadProgress(pct)
      );

      const linkRes = await fetch(`/api/measurements/${targetLog.measurementId}/photos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      if (!linkRes.ok) throw new Error(`Photo link failed (${linkRes.status})`);

      fetchLogs();
    } catch (err) {
      console.error("Failed to upload photo:", err);
      setActionError(t("Foto uploaden mislukt. Probeer het opnieuw."));
    } finally {
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      setOptimisticPhotoUrl(null);
      setUploadingLogId(null);
      setUploadStage("idle");
      setUploadProgress(0);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: number) => {
    setActionError(null);
    try {
      await api.measurements.deletePhoto(photoId);
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setActionError(t("Foto verwijderen mislukt. Probeer het opnieuw."));
    }
  };

  return {
    uploadingLogId,
    uploadProgress,
    uploadStage,
    optimisticPhotoUrl,
    handlePhotoUpload,
    handleDeletePhoto,
  };
}
