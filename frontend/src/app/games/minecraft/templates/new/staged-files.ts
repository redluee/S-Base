export interface StagedFile {
  file: File;
  type: "mods" | "datapacks" | "resourcepacks";
}

export function formatFileSize(bytes: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
