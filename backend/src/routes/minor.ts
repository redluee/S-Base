import { Elysia } from "elysia";
import { ASSET_NAME_PATTERN, bearerTokenCheck, buildPublicSnapshot, defaultUploadsDir, resolvePublishUserId } from "../modules/minor/public-snapshot";
import { join } from "path";
import { ATTACHMENT_EXTENSIONS } from "../utils/uploads";
import { minor, minorAuth, saveUpload } from "../context";
import * as schema from "../modules/minor/minor-schemas";

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

  .group("/api/minor", (app) =>
    app
      .use(minorAuth)
      .get("/dashboard", ({ userId }) => minor.dashboard.getStats(userId))
      .get("/sprints/next-number", ({ userId }) => minor.sprints.getNextNumber(userId))
      .get("/sprints/calculate-dates", ({ userId, query }) => minor.schedule.calculateSprintDates(userId, query.startDate, query.durationDays), {
        query: schema.calculateDatesQuery,
      })
      .get("/sprints", ({ userId }) => minor.sprints.list(userId))
      .post("/sprints", ({ userId, body }) => minor.sprints.create(userId, body), { body: schema.sprintCreateBody })
      .post("/sprints/import", ({ userId, body }) => minor.transfer.importSprint(userId, body, undefined, Boolean(body.overwrite)), {
        body: schema.importBody,
      })
      .get("/sprints/:id", ({ params: { id }, userId }) => minor.sprints.getById(id, userId), { params: schema.idParams })
      .get("/sprints/:id/export", ({ params: { id }, userId }) => minor.transfer.exportSprint(id, userId), { params: schema.idParams })
      .post("/sprints/:id/import", ({ params: { id }, userId, body }) => minor.transfer.importSprint(userId, body, id, Boolean(body.overwrite)), {
        params: schema.idParams,
        body: schema.importBody,
      })
      .put("/sprints/:id", ({ params: { id }, userId, body }) => minor.sprints.update(id, userId, body), {
        params: schema.idParams,
        body: schema.sprintUpdateBody,
      })
      .delete("/sprints/:id", ({ params: { id }, userId }) => minor.sprints.remove(id, userId), { params: schema.idParams })
      .get("/stories", ({ userId }) => minor.stories.listAll(userId))
      .post("/stories", ({ userId, body }) => minor.stories.create(userId, body.sprintId, body), { body: schema.storyCreateBody })
      .post("/sprints/:id/stories", ({ params: { id }, userId, body }) => minor.stories.create(userId, id, body), {
        params: schema.idParams,
        body: schema.storyCreateBody,
      })
      .put("/sprints/:id/stories/reorder", ({ params: { id }, userId, body }) => minor.stories.reorder(id, userId, body.storyIds), {
        params: schema.idParams,
        body: schema.reorderBody,
      })
      .put("/stories/:id", ({ params: { id }, userId, body }) => minor.stories.update(id, userId, body), {
        params: schema.idParams,
        body: schema.storyUpdateBody,
      })
      .delete("/stories/:id", ({ params: { id }, userId }) => minor.stories.remove(id, userId), { params: schema.idParams })
      .patch("/criteria/:id/toggle", ({ params: { id }, body }) => minor.stories.toggleCriterion(id, body.isCompleted), {
        params: schema.idParams,
        body: schema.toggleBody,
      })
      .post("/sprints/:id/self-evaluations/auto", ({ params: { id }, userId }) => minor.drafts.autoGenerate(id, userId), { params: schema.idParams })
      .put("/sprints/:id/self-evaluations", ({ params: { id }, userId, body }) => minor.evaluations.saveSelfEvaluations(id, userId, body.evaluations), {
        params: schema.idParams,
        body: schema.selfEvaluationsBody,
      })
      .put("/sprints/:id/teacher-assessments", ({ params: { id }, userId, body }) => minor.evaluations.saveTeacherAssessments(id, userId, body.assessments), {
        params: schema.idParams,
        body: schema.teacherAssessmentsBody,
      })
      .get("/sprints/:id/feedback", ({ params: { id }, userId }) => minor.feedback.list(id, userId), { params: schema.idParams })
      .post("/sprints/:id/feedback", ({ params: { id }, userId, body }) => minor.feedback.add(id, userId, body), {
        params: schema.idParams,
        body: schema.feedbackCreateBody,
      })
      .put("/feedback/:id", ({ params: { id }, userId, body }) => minor.feedback.update(id, userId, body), {
        params: schema.idParams,
        body: schema.feedbackUpdateBody,
      })
      .delete("/feedback/:id", ({ params: { id }, userId }) => minor.feedback.remove(id, userId), { params: schema.idParams })
      .get("/sprints/:id/reflection", ({ params: { id }, userId }) => minor.feedback.getReflection(id, userId), { params: schema.idParams })
      .put("/sprints/:id/reflection", ({ params: { id }, userId, body }) => minor.feedback.saveReflection(id, userId, body), {
        params: schema.idParams,
        body: schema.reflectionBody,
      })
      .get("/vacations", ({ userId }) => minor.schedule.listVacations(userId))
      .post("/vacations", ({ userId, body }) => minor.schedule.createVacation(userId, body), { body: schema.vacationCreateBody })
      .put("/vacations/:id", ({ params: { id }, userId, body }) => minor.schedule.updateVacation(id, userId, body), {
        params: schema.idParams,
        body: schema.vacationUpdateBody,
      })
      .delete("/vacations/:id", ({ params: { id }, userId }) => minor.schedule.removeVacation(id, userId), { params: schema.idParams })
      .get("/story-types", ({ userId }) => minor.storyTypes.list(userId))
      .post("/story-types", ({ userId, body }) => minor.storyTypes.create(userId, body), { body: schema.storyTypeCreateBody })
      .put("/story-types/:id", ({ params: { id }, userId, body }) => minor.storyTypes.update(id, userId, body), {
        params: schema.idParams,
        body: schema.storyTypeUpdateBody,
      })
      .delete("/story-types/:id", ({ params: { id }, userId }) => minor.storyTypes.remove(id, userId), { params: schema.idParams })
      .get("/peer-help", ({ userId }) => minor.peerHelp.list(userId))
      .post("/peer-help", ({ userId, body }) => minor.peerHelp.create(userId, body), { body: schema.peerHelpCreateBody })
      .put("/peer-help/:id", ({ params: { id }, userId, body }) => minor.peerHelp.update(id, userId, body), {
        params: schema.idParams,
        body: schema.peerHelpUpdateBody,
      })
      .delete("/peer-help/:id", ({ params: { id }, userId }) => minor.peerHelp.remove(id, userId), { params: schema.idParams })
      .get("/settings", ({ userId }) => minor.settings.get(userId))
      .put("/settings", ({ userId, body }) => minor.settings.save(userId, body), { body: schema.settingsBody })
      .post(
        "/upload",
        async ({ body }) => {
          const { filename, originalName } = await saveUpload(body, "minor_", ATTACHMENT_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}`, originalName };
        },
        { body: schema.uploadBody },
      ),
  );
