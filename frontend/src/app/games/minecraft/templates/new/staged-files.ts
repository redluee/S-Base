import type { FolderType } from "@backend/shared/minecraft";

export interface StagedFile {
  file: File;
  type: FolderType;
}
