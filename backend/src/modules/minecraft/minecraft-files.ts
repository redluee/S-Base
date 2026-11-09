import { existsSync } from "fs";
import { copyFile, readdir, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { resolveUploadExtension } from "../../utils/uploads";
import type { MinecraftParts } from "./minecraft-parts";
import { MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS, validateFilename, validateFolderType, validateSlug } from "./validation";

export interface McFileInfo {
  name: string;
  size: number;
  modified: string;
}

export async function listDirectory(dirPath: string): Promise<McFileInfo[]> {
  try {
    const results: McFileInfo[] = [];
    for (const f of await readdir(dirPath)) {
      try {
        const s = await stat(join(dirPath, f));
        if (s.isFile()) results.push({ name: f, size: s.size, modified: s.mtime.toISOString() });
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

export async function validateUploads(files: File[]) {
  if (files.length === 0) throw new ValidationError("upload.noFile");
  for (const file of files) {
    resolveUploadExtension(file, UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES);
    validateFilename(file.name);
  }
}

export class MinecraftFiles {
  constructor(private readonly parts: MinecraftParts) {}

  private async reloadDatapacks(slug: string, type: string) {
    if (type === "datapacks" && this.parts.lifecycle.isRunning(slug)) {
      await this.parts.lifecycle.sendCommand(slug, "reload");
    }
  }

  async list(slug: string, type: string) {
    const folder = validateFolderType(type);
    const server = this.parts.servers.get(slug);
    try {
      return await listDirectory(await this.parts.dirs.subdir(server.serverDir, folder));
    } catch {
      return [];
    }
  }

  async upload(slug: string, type: string, filename: string, buffer: ArrayBuffer) {
    const folder = validateFolderType(type);
    validateFilename(filename);
    const server = this.parts.servers.get(slug);
    const dirPath = await this.parts.dirs.subdir(server.serverDir, folder);
    await writeFile(join(dirPath, filename), Buffer.from(buffer));
    await this.reloadDatapacks(slug, folder);
  }

  async uploadMany(slug: string, type: string, files: File[]) {
    validateFolderType(type);
    this.parts.servers.get(slug);
    await validateUploads(files);
    for (const file of files) {
      await this.upload(slug, type, file.name, await file.arrayBuffer());
    }
    return { ok: true, count: files.length };
  }

  async remove(slug: string, type: string, filename: string) {
    const folder = validateFolderType(type);
    validateFilename(filename);
    const server = this.parts.servers.get(slug);
    const dirPath = await this.parts.dirs.subdir(server.serverDir, folder);
    await unlink(join(dirPath, filename)).catch(() => {});
    if (folder === "datapacks") {
      await unlink(join(server.serverDir, "datapacks", filename)).catch(() => {});
    }
    await this.reloadDatapacks(slug, folder);
    return { ok: true };
  }

  async copyFromServer(slug: string, type: string, sourceSlug: string, filename: string) {
    const folder = validateFolderType(type);
    validateSlug(sourceSlug);
    validateFilename(filename);
    const target = this.parts.servers.get(slug);
    const source = this.parts.servers.get(sourceSlug);
    const sourceDir = await this.parts.dirs.subdir(source.serverDir, folder);
    if (!existsSync(join(sourceDir, filename))) throw new NotFoundError("minecraft.fileNotFound");
    const targetDir = await this.parts.dirs.subdir(target.serverDir, folder);
    await copyFile(join(sourceDir, filename), join(targetDir, filename));
    await this.reloadDatapacks(slug, folder);
    return { ok: true };
  }
}
