import { Elysia } from "elysia";
import { ensureGoogleFont, googleFamilyOf, resolveFontFile } from "../modules/resume/fonts";
import { join } from "path";
import { mkdir } from "fs/promises";
import { resume, resumeAuth, badRequest, notFoundOr } from "../context";

export const resumeRoutes = new Elysia()
  // --- Resume routes ---
  .group("/api/resume", (app) =>
    app
      .use(resumeAuth)
      .get("/profile", ({ userId }) => resume.getProfile(userId))
      .put("/profile", ({ userId, body }) => badRequest(() => resume.upsertProfile(userId, (body ?? {}) as any)))
      .post("/profile/photo", async ({ userId, body }) => {
        const { file } = (body ?? {}) as any;
        if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
          return new Response("No image uploaded", { status: 400 });
        }
        if (file.size > 8 * 1024 * 1024) return new Response("File too large", { status: 413 });
        const uploadsDir = join(import.meta.dir, "../../uploads");
        await mkdir(uploadsDir, { recursive: true });
        const ext = ({ "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type] ?? "jpg";
        const filename = `resume_${crypto.randomUUID()}.${ext}`;
        await Bun.write(join(uploadsDir, filename), file);
        const { profile, previousPath } = resume.setPhoto(userId, `/api/resume/photo/${filename}`);
        if (previousPath?.startsWith("/api/resume/photo/")) {
          await Bun.file(join(uploadsDir, previousPath.split("/").pop() as string)).delete().catch(() => {});
        }
        return profile;
      })
      .delete("/profile/photo", async ({ userId }) => {
        const { profile, previousPath } = resume.setPhoto(userId, null);
        if (previousPath?.startsWith("/api/resume/photo/")) {
          await Bun.file(join(import.meta.dir, "../../uploads", previousPath.split("/").pop() as string)).delete().catch(() => {});
        }
        return profile;
      })
      .get("/photo/:filename", async ({ params: { filename }, userId }) => {
        if (!/^resume_[0-9a-f-]+\.(jpg|png|webp)$/.test(filename) || !resume.ownsPhoto(userId, `/api/resume/photo/${filename}`)) {
          return new Response("Not Found", { status: 404 });
        }
        const file = Bun.file(join(import.meta.dir, "../../uploads", filename));
        return (await file.exists()) ? new Response(file, { headers: { "Cache-Control": "private, max-age=300" } }) : new Response("Not Found", { status: 404 });
      })
      .get("/experiences", ({ userId }) => resume.listExperiences(userId))
      .post("/experiences", ({ userId, body }) => badRequest(() => resume.createExperience(userId, body ?? {})))
      .put("/experiences/:id", ({ params: { id }, userId, body }) => badRequest(() => notFoundOr(resume.updateExperience(Number(id), userId, body ?? {}))))
      .delete("/experiences/:id", ({ params: { id }, userId }) => resume.deleteExperience(Number(id), userId) ? { success: true } : new Response("Not Found", { status: 404 }))
      .get("/educations", ({ userId }) => resume.listEducations(userId))
      .post("/educations", ({ userId, body }) => badRequest(() => resume.createEducation(userId, body ?? {})))
      .put("/educations/:id", ({ params: { id }, userId, body }) => badRequest(() => notFoundOr(resume.updateEducation(Number(id), userId, body ?? {}))))
      .delete("/educations/:id", ({ params: { id }, userId }) => resume.deleteEducation(Number(id), userId) ? { success: true } : new Response("Not Found", { status: 404 }))
      .get("/resumes", ({ userId }) => resume.listResumes(userId))
      .post("/resumes", ({ userId, body }) => badRequest(() => resume.createResume(userId, body ?? {})))
      .get("/resumes/:id", ({ params: { id }, userId }) => notFoundOr(resume.getResumeFull(Number(id), userId)))
      .put("/resumes/:id", ({ params: { id }, userId, body }) => badRequest(() => notFoundOr(resume.updateResume(Number(id), userId, body ?? {}))))
      .delete("/resumes/:id", ({ params: { id }, userId }) => resume.deleteResume(Number(id), userId) ? { success: true } : new Response("Not Found", { status: 404 }))
      .post("/resumes/:id/duplicate", ({ params: { id }, userId }) => notFoundOr(resume.duplicateResume(Number(id), userId)))
      .put("/resumes/:id/items", ({ params: { id }, userId, body }) => badRequest(() => notFoundOr(resume.setResumeItems(Number(id), userId, (body as any)?.items ?? []))))
      .get("/fonts/google", async ({ query }) => {
        const family = googleFamilyOf(`google:${String((query as any)?.family ?? "").trim()}`);
        try {
          return await ensureGoogleFont(family as string);
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "Font unavailable" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
      })
      .get("/fonts/file/:name", async ({ params: { name } }) => {
        const path = resolveFontFile(name);
        if (!path) return new Response("Not Found", { status: 404 });
        const file = Bun.file(path);
        return (await file.exists()) ? new Response(file, { headers: { "Content-Type": "font/ttf", "Cache-Control": "private, max-age=86400" } }) : new Response("Not Found", { status: 404 });
      })
  );
