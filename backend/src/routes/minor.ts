import { Elysia } from "elysia";
import { ASSET_NAME_PATTERN, bearerTokenCheck, buildPublicSnapshot, defaultUploadsDir, resolvePublishUserId } from "../modules/minor/public-snapshot";
import { join } from "path";
import { ATTACHMENT_EXTENSIONS } from "../utils/uploads";
import { minor, minorAuth, validated, saveUpload } from "../context";

export const minorRoutes = new Elysia()
  .get("/api/minor/public/snapshot", ({ request }) => {
    const denied = bearerTokenCheck(request, "MINOR_SNAPSHOT_TOKEN");
    if (denied) return denied;
    const ownerId = resolvePublishUserId();
    if (ownerId === null) {
      return new Response(JSON.stringify({ error: "Publish user not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return buildPublicSnapshot(minor, ownerId);
  })
  .get("/api/minor/public/assets/:filename", async ({ params: { filename }, request }) => {
    const denied = bearerTokenCheck(request, "MINOR_SNAPSHOT_TOKEN");
    if (denied) return denied;
    if (!ASSET_NAME_PATTERN.test(filename)) return new Response("Not Found", { status: 404 });
    const file = Bun.file(join(defaultUploadsDir, filename));
    if (!(await file.exists())) return new Response("Not Found", { status: 404 });
    return new Response(file);
  })

  // --- Minor App / Sprint & Portfolio routes ---
  .group("/api/minor", (app) =>
    app
      .use(minorAuth)
      .get("/dashboard", ({ userId }) => minor.getDashboardStats(userId))
      .get("/sprints/next-number", ({ userId }) => minor.getNextSprintNumber(userId))
      .get("/sprints/calculate-dates", ({ userId, query }) => {
        const startDate = (query as any)?.startDate || new Date().toISOString().slice(0, 10);
        const durationDays = (query as any)?.durationDays ? Number((query as any).durationDays) : 14;
        return minor.calculateSprintDates(userId, startDate, durationDays);
      })
      .get("/sprints", ({ userId }) => minor.listSprints(userId))
      .post("/sprints", ({ userId, body }) => minor.createSprint(userId, (body ?? {}) as any))
      .post("/sprints/import", ({ userId, body }) => {
        const b = (body ?? {}) as any;
        const targetSprintId = b.targetSprintId ? Number(b.targetSprintId) : undefined;
        const overwrite = Boolean(b.overwrite);
        return minor.importSprint(userId, b, targetSprintId, overwrite);
      })
      .get("/sprints/:id", ({ params: { id }, userId }) => {
        const s = minor.getSprintById(Number(id), userId);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .get("/sprints/:id/export", ({ params: { id }, userId }) => {
        const exp = minor.exportSprint(Number(id), userId);
        if (!exp) return new Response("Not Found", { status: 404 });
        return exp;
      })
      .post("/sprints/:id/import", ({ params: { id }, userId, body }) => {
        const b = (body ?? {}) as any;
        const overwrite = Boolean(b.overwrite);
        return minor.importSprint(userId, b, Number(id), overwrite);
      })
      .put("/sprints/:id", ({ params: { id }, userId, body }) => {
        const s = minor.updateSprint(Number(id), userId, (body ?? {}) as any);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .delete("/sprints/:id", ({ params: { id }, userId }) => {
        const r = minor.deleteSprint(Number(id), userId);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/stories", ({ userId }) => minor.listAllStories(userId))
      .post("/stories", ({ userId, body }) => minor.createStory(userId, (body as any)?.sprintId ?? null, (body ?? {}) as any))
      .post("/sprints/:id/stories", ({ params: { id }, userId, body }) => minor.createStory(userId, Number(id), (body ?? {}) as any))
      .put("/sprints/:id/stories/reorder", ({ params: { id }, userId, body }) => {
        const storyIds = ((body as any)?.storyIds || []) as number[];
        const res = minor.reorderStories(Number(id), userId, storyIds);
        if (!res) return new Response("Not Found", { status: 404 });
        return res;
      })
      .put("/stories/:id", ({ params: { id }, userId, body }) => {
        const s = minor.updateStory(Number(id), userId, (body ?? {}) as any);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .delete("/stories/:id", ({ params: { id }, userId }) => {
        const r = minor.deleteStory(Number(id), userId);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .patch("/criteria/:id/toggle", ({ params: { id }, body }) => {
        const isCompleted = Boolean((body as any)?.isCompleted);
        const c = minor.toggleCriterion(Number(id), isCompleted);
        if (!c) return new Response("Not Found", { status: 404 });
        return c;
      })
      .post("/sprints/:id/self-evaluations/auto", ({ params: { id }, userId }) => minor.autoGenerateSelfEvaluations(Number(id), userId))
      .put("/sprints/:id/self-evaluations", ({ params: { id }, userId, body }) => minor.saveSelfEvaluations(Number(id), userId, (body as any)?.evaluations || []))
      .put("/sprints/:id/teacher-assessments", ({ params: { id }, userId, body }) => minor.saveTeacherAssessments(Number(id), userId, (body as any)?.assessments || []))
      .get("/sprints/:id/feedback", ({ params: { id } }) => minor.listFeedback(Number(id)))
      .post("/sprints/:id/feedback", ({ params: { id }, body }) => minor.addFeedback(Number(id), (body ?? {}) as any))
      .put("/feedback/:id", ({ params: { id }, body }) => {
        const fb = minor.updateFeedback(Number(id), (body ?? {}) as any);
        if (!fb) return new Response("Not Found", { status: 404 });
        return fb;
      })
      .delete("/feedback/:id", ({ params: { id } }) => {
        const r = minor.deleteFeedback(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/sprints/:id/reflection", ({ params: { id } }) => minor.getReflection(Number(id)))
      .put("/sprints/:id/reflection", ({ params: { id }, body }) => minor.saveReflection(Number(id), (body ?? {}) as any))
      .get("/vacations", ({ userId }) => minor.listVacations(userId))
      .post("/vacations", ({ userId, body }) => minor.createVacation(userId, (body ?? {}) as any))
      .put("/vacations/:id", ({ params: { id }, userId, body }) => {
        const v = minor.updateVacation(Number(id), userId, (body ?? {}) as any);
        if (!v) return new Response("Not Found", { status: 404 });
        return v;
      })
      .delete("/vacations/:id", ({ params: { id }, userId }) => {
        const r = minor.deleteVacation(Number(id), userId);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/story-types", ({ userId }) => minor.listStoryTypes(userId))
      .post("/story-types", ({ userId, body }) => minor.createStoryType(userId, (body ?? {}) as any))
      .put("/story-types/:id", ({ params: { id }, userId, body }) => {
        const t = minor.updateStoryType(Number(id), userId, (body ?? {}) as any);
        if (!t) return new Response("Not Found", { status: 404 });
        return t;
      })
      .delete("/story-types/:id", ({ params: { id }, userId }) => {
        const r = minor.deleteStoryType(Number(id), userId);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/peer-help", ({ userId }) => minor.listPeerHelp(userId))
      .post("/peer-help", ({ userId, body }) => minor.createPeerHelp(userId, (body ?? {}) as any))
      .put("/peer-help/:id", ({ params: { id }, userId, body }) => {
        const p = minor.updatePeerHelp(Number(id), userId, (body ?? {}) as any);
        if (!p) return new Response("Not Found", { status: 404 });
        return p;
      })
      .delete("/peer-help/:id", ({ params: { id }, userId }) => {
        const r = minor.deletePeerHelp(Number(id), userId);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/settings", ({ userId }) => minor.getSettings(userId))
      .put("/settings", ({ userId, body }) => minor.saveSettings(userId, (body ?? {}) as any))
      .post("/upload", async ({ body }) => {
        return validated(async () => {
          const { filename, originalName } = await saveUpload(body, "minor_", ATTACHMENT_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}`, originalName };
        });
      })
  );
