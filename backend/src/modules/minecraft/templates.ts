import { join } from "path";
import { mkdir, writeFile, rm, unlink, readdir, copyFile, stat } from "fs/promises";
import db from "../../db/client";
import { mc_templates, mc_template_files } from "../../db/schema/minecraft";
import { eq, and } from "drizzle-orm";
import { TEMPLATES_DIR } from "./paths";
import { validateSlug, validateFilename } from "./validation";
import type { MinecraftService } from "./index";

export function listTemplates(this: MinecraftService) {
  return db.select().from(mc_templates).all();
}

export function getTemplate(this: MinecraftService, id: number) {
  const t = db.select().from(mc_templates).where(eq(mc_templates.templateId, id)).get();
  if (!t) return null;
  const files = db.select().from(mc_template_files).where(eq(mc_template_files.templateId, id)).all();
  return { ...t, files };
}

export async function saveAsTemplate(this: MinecraftService, slug: string, name: string, notes?: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  const props = await this.readProperties(slug);
  const propsJson = JSON.stringify(props);
  const t = db.insert(mc_templates).values({
    name, engine: server.engine, mcVersion: server.mcVersion, javaArgs: server.javaArgs, propertiesJson: propsJson, notes
  }).returning().get();

  const tDir = join(TEMPLATES_DIR, t.templateId.toString());
  await mkdir(tDir, { recursive: true });

  for (const type of ["mods", "datapacks", "resourcepacks"]) {
    try {
      const sourceDir = await this.getServerSubdir(server.serverDir, type);
      const files = await readdir(sourceDir);
      for (const f of files) {
        const statData = await stat(join(sourceDir, f));
        if (statData.isFile()) {
          db.insert(mc_template_files).values({ templateId: t.templateId, fileType: type, filename: f }).run();
          await mkdir(join(tDir, type), { recursive: true });
          await copyFile(join(sourceDir, f), join(tDir, type, f));
        }
      }
    } catch {}
  }
  return t;
}

export async function createCustomTemplate(this: MinecraftService, data: {
  name: string;
  engine: string;
  mcVersion: string;
  properties?: Record<string, string>;
  notes?: string;
  javaArgs?: string;
}) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Template name is required");
  }
  const propsJson = data.properties ? JSON.stringify(data.properties) : null;
  const t = db.insert(mc_templates).values({
    name: data.name.trim(),
    engine: data.engine || "vanilla",
    mcVersion: data.mcVersion,
    javaArgs: data.javaArgs || null,
    propertiesJson: propsJson,
    notes: data.notes || null,
  }).returning().get();

  const tDir = join(TEMPLATES_DIR, t.templateId.toString());
  await mkdir(join(tDir, "mods"), { recursive: true });
  await mkdir(join(tDir, "datapacks"), { recursive: true });
  await mkdir(join(tDir, "resourcepacks"), { recursive: true });

  return this.getTemplate(t.templateId);
}

export async function listTemplateFiles(this: MinecraftService, templateId: number, type: string) {
  const t = this.getTemplate(templateId);
  if (!t) throw new Error("Template not found");
  try {
    const dirPath = join(TEMPLATES_DIR, templateId.toString(), type);
    const files = await readdir(dirPath);
    const results: { name: string; size: number; modified: string }[] = [];
    for (const f of files) {
      try {
        const s = await stat(join(dirPath, f));
        if (s.isFile()) {
          results.push({
            name: f,
            size: s.size,
            modified: s.mtime.toISOString(),
          });
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

export async function uploadTemplateFile(this: MinecraftService, templateId: number, type: string, filename: string, buffer: ArrayBuffer) {
  validateFilename(filename);
  const t = this.getTemplate(templateId);
  if (!t) throw new Error("Template not found");
  const tDir = join(TEMPLATES_DIR, templateId.toString(), type);
  await mkdir(tDir, { recursive: true });
  await writeFile(join(tDir, filename), Buffer.from(buffer));

  const existing = db.select().from(mc_template_files).where(
    and(
      eq(mc_template_files.templateId, templateId),
      eq(mc_template_files.fileType, type),
      eq(mc_template_files.filename, filename)
    )
  ).get();

  if (!existing) {
    db.insert(mc_template_files).values({
      templateId,
      fileType: type,
      filename,
    }).run();
  }
}

export async function deleteTemplateFile(this: MinecraftService, templateId: number, type: string, filename: string) {
  validateFilename(filename);
  const t = this.getTemplate(templateId);
  if (!t) throw new Error("Template not found");
  const filePath = join(TEMPLATES_DIR, templateId.toString(), type, filename);
  await unlink(filePath).catch(() => {});
  db.delete(mc_template_files).where(
    and(
      eq(mc_template_files.templateId, templateId),
      eq(mc_template_files.fileType, type),
      eq(mc_template_files.filename, filename)
    )
  ).run();
}

export async function deleteTemplate(this: MinecraftService, id: number) {
  const t = this.getTemplate(id);
  if (t) {
    db.delete(mc_templates).where(eq(mc_templates.templateId, id)).run();
    await rm(join(TEMPLATES_DIR, id.toString()), { recursive: true, force: true });
  }
  return { ok: true };
}

export async function speedrunFromTemplate(this: MinecraftService, templateId: number, newSlug: string, displayName: string) {
  validateSlug(newSlug);
  const t = this.getTemplate(templateId);
  if (!t) throw new Error("Template not found");
  const seed = Math.floor(Math.random() * 2**48).toString();
  const s = await this.createServer({ slug: newSlug, displayName, engine: t.engine, mcVersion: t.mcVersion, javaArgs: t.javaArgs || undefined, templateId });
  const props = JSON.parse(t.propertiesJson || "{}");
  props["level-seed"] = seed;
  await this.writeProperties(newSlug, props);

  const tDir = join(TEMPLATES_DIR, templateId.toString());
  if (s && t.files) {
    for (const f of t.files) {
      const destDir = await this.getServerSubdir(s.serverDir, f.fileType);
      await copyFile(join(tDir, f.fileType, f.filename), join(destDir, f.filename)).catch(() => {});
    }
  }
  return this.getServer(newSlug);
}
