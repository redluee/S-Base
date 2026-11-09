import { and, eq } from "drizzle-orm";
import { copyFile, mkdir, readdir, rm, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_template_files, mc_templates } from "../../db/schema/minecraft";
import { ConflictError, orNotFound } from "../../utils/errors";
import { listDirectory, validateUploads } from "./minecraft-files";
import type { MinecraftParts } from "./minecraft-parts";
import { TEMPLATES_DIR } from "./paths";
import {
  FOLDER_TYPES,
  requireText,
  validateEngine,
  validateFilename,
  validateFolderType,
  validateSlug,
} from "./validation";

export interface CustomTemplateInput {
  name: string;
  engine: string;
  mcVersion: string;
  properties?: Record<string, string>;
  notes?: string | null;
  javaArgs?: string | null;
}

export interface CreateTemplateInput extends Partial<CustomTemplateInput> {
  slug?: string;
  name: string;
}

export class MinecraftTemplates {
  constructor(private readonly parts: MinecraftParts) {}

  list() {
    return db.select().from(mc_templates).all();
  }

  get(id: number) {
    const t = orNotFound(
      db.select().from(mc_templates).where(eq(mc_templates.templateId, id)).get(),
      "minecraft.templateNotFound",
    );
    const files = db.select().from(mc_template_files).where(eq(mc_template_files.templateId, id)).all();
    return { ...t, files };
  }

  private requireFreeName(name: string) {
    if (db.select().from(mc_templates).where(eq(mc_templates.name, name)).get()) {
      throw new ConflictError("minecraft.templateNameExists");
    }
  }

  create(data: CreateTemplateInput) {
    if (data.slug) return this.saveFromServer(data.slug, data.name, data.notes);
    return this.createCustom({
      name: data.name,
      engine: data.engine ?? "vanilla",
      mcVersion: data.mcVersion ?? "",
      properties: data.properties,
      notes: data.notes,
      javaArgs: data.javaArgs,
    });
  }

  async saveFromServer(slug: string, name: string, notes?: string | null) {
    const server = this.parts.servers.get(slug);
    const templateName = requireText(name, "minecraft.templateNameRequired");
    this.requireFreeName(templateName);
    const props = await this.parts.properties.read(slug);
    const t = db
      .insert(mc_templates)
      .values({
        name: templateName,
        engine: server.engine,
        mcVersion: server.mcVersion,
        javaArgs: server.javaArgs,
        propertiesJson: JSON.stringify(props),
        notes: notes || null,
      })
      .returning()
      .get();

    const tDir = join(TEMPLATES_DIR, t.templateId.toString());
    await mkdir(tDir, { recursive: true });

    for (const type of FOLDER_TYPES) {
      try {
        const sourceDir = await this.parts.dirs.subdir(server.serverDir, type);
        for (const f of await readdir(sourceDir)) {
          if ((await stat(join(sourceDir, f))).isFile()) {
            db.insert(mc_template_files).values({ templateId: t.templateId, fileType: type, filename: f }).run();
            await mkdir(join(tDir, type), { recursive: true });
            await copyFile(join(sourceDir, f), join(tDir, type, f));
          }
        }
      } catch {}
    }
    return t;
  }

  async createCustom(data: CustomTemplateInput) {
    const name = requireText(data.name, "minecraft.templateNameRequired");
    const engine = validateEngine(data.engine || "vanilla");
    const mcVersion = requireText(data.mcVersion, "minecraft.versionRequired");
    this.requireFreeName(name);

    const t = db
      .insert(mc_templates)
      .values({
        name,
        engine,
        mcVersion,
        javaArgs: data.javaArgs || null,
        propertiesJson: data.properties ? JSON.stringify(data.properties) : null,
        notes: data.notes || null,
      })
      .returning()
      .get();

    for (const type of FOLDER_TYPES) {
      await mkdir(join(TEMPLATES_DIR, t.templateId.toString(), type), { recursive: true });
    }
    return this.get(t.templateId);
  }

  listFiles(id: number, type: string) {
    const folder = validateFolderType(type);
    this.get(id);
    return listDirectory(join(TEMPLATES_DIR, id.toString(), folder));
  }

  async uploadFile(id: number, type: string, filename: string, buffer: ArrayBuffer) {
    const folder = validateFolderType(type);
    validateFilename(filename);
    this.get(id);
    const dir = join(TEMPLATES_DIR, id.toString(), folder);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(buffer));

    const existing = db
      .select()
      .from(mc_template_files)
      .where(
        and(
          eq(mc_template_files.templateId, id),
          eq(mc_template_files.fileType, folder),
          eq(mc_template_files.filename, filename),
        ),
      )
      .get();
    if (!existing) {
      db.insert(mc_template_files).values({ templateId: id, fileType: folder, filename }).run();
    }
  }

  async uploadMany(id: number, type: string, files: File[]) {
    validateFolderType(type);
    this.get(id);
    await validateUploads(files);
    for (const file of files) {
      await this.uploadFile(id, type, file.name, await file.arrayBuffer());
    }
    return { ok: true, count: files.length };
  }

  async removeFile(id: number, type: string, filename: string) {
    const folder = validateFolderType(type);
    validateFilename(filename);
    this.get(id);
    await unlink(join(TEMPLATES_DIR, id.toString(), folder, filename)).catch(() => {});
    db.delete(mc_template_files)
      .where(
        and(
          eq(mc_template_files.templateId, id),
          eq(mc_template_files.fileType, folder),
          eq(mc_template_files.filename, filename),
        ),
      )
      .run();
    return { ok: true };
  }

  async remove(id: number) {
    this.get(id);
    db.delete(mc_templates).where(eq(mc_templates.templateId, id)).run();
    await rm(join(TEMPLATES_DIR, id.toString()), { recursive: true, force: true });
    return { ok: true };
  }

  async speedrun(id: number, newSlug: string, displayName: string) {
    validateSlug(newSlug);
    const t = this.get(id);
    const seed = Math.floor(Math.random() * 2 ** 48).toString();
    const server = await this.parts.servers.create({
      slug: newSlug,
      displayName,
      engine: t.engine,
      mcVersion: t.mcVersion,
      javaArgs: t.javaArgs,
      templateId: id,
    });
    const props = JSON.parse(t.propertiesJson || "{}");
    props["level-seed"] = seed;
    await this.parts.properties.write(newSlug, props);

    const tDir = join(TEMPLATES_DIR, id.toString());
    for (const f of t.files) {
      const destDir = await this.parts.dirs.subdir(server.serverDir, f.fileType);
      await copyFile(join(tDir, f.fileType, f.filename), join(destDir, f.filename)).catch(() => {});
    }
    return this.parts.servers.get(newSlug);
  }
}
