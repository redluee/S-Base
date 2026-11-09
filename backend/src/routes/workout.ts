import { Elysia, t } from "elysia";
import { join } from "path";
import { AppError, NotFoundError } from "../utils/errors";
import { IMAGE_EXTENSIONS, UPLOAD_NAME_PATTERN, uploadResponseHeaders } from "../utils/uploads";
import { auth, saveUpload, workout, workoutAuth } from "../context";
import {
  idParams,
  measurementSaveBody,
  measurementUpdateBody,
  sessionCompleteBody,
  sessionCreateBody,
  sessionUpdateBody,
  templateCreateBody,
  templateUpdateBody,
} from "../modules/workout/workout-schemas";

const searchQuery = t.Object({ q: t.Optional(t.String()) });

export const workoutRoutes = new Elysia()
  .group("/api/workouts", (app) =>
    app
      .use(workoutAuth)
      .get("/templates", ({ userId }) => workout.templates.list(userId))
      .patch("/templates/reorder", ({ body, userId }) => workout.templates.reorder(userId, body.templateIds), {
        body: t.Object({ templateIds: t.Array(t.Number()) }),
      })
      .get("/templates/:id", ({ params: { id }, userId }) => workout.templates.get(id, userId), { params: idParams })
      .post("/templates", ({ body, userId }) => workout.templates.create(userId, body), { body: templateCreateBody })
      .put("/templates/:id", ({ params: { id }, body, userId }) => workout.templates.update(id, userId, body), {
        params: idParams,
        body: templateUpdateBody,
      })
      .delete("/templates/:id", ({ params: { id }, userId }) => workout.templates.remove(id, userId), {
        params: idParams,
      })
      .get("/sessions", ({ query, userId }) => workout.sessions.list(userId, query.status, query.q), {
        query: t.Object({ status: t.Optional(t.String()), q: t.Optional(t.String()) }),
      })
      .get("/sessions/:id", ({ params: { id }, userId }) => workout.sessions.get(id, userId), { params: idParams })
      .get(
        "/sessions/:id/prs",
        ({ params: { id }, query, userId }) => {
          const parsed = query.duration ? Number(query.duration) : undefined;
          const duration = parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
          return workout.stats.sessionPRs(id, userId, duration);
        },
        { params: idParams, query: t.Object({ duration: t.Optional(t.String()) }) },
      )
      .post(
        "/sessions",
        ({ body, userId }) => workout.sessions.create(userId, body?.templateId || undefined, body?.force === true),
        { body: sessionCreateBody },
      )
      .patch("/sessions/:id", ({ params: { id }, body, userId }) => workout.sessions.update(id, userId, body), {
        params: idParams,
        body: sessionUpdateBody,
      })
      .patch(
        "/sessions/:id/complete",
        ({ params: { id }, body, userId }) => workout.sessions.complete(id, userId, body?.completedAt),
        { params: idParams, body: sessionCompleteBody },
      )
      .delete("/sessions/:id", ({ params: { id }, userId }) => workout.sessions.remove(id, userId), {
        params: idParams,
      })
      .get("/exercises", ({ userId }) => workout.exercises.list(userId))
      .get("/stats", ({ userId }) => workout.stats.summary(userId))
      .get("/exercises/suggest", ({ query: { q }, userId }) => (q ? workout.suggestions.exercises(userId, q) : []), {
        query: searchQuery,
      })
      .get("/suggest", ({ query: { q }, userId }) => (q ? workout.suggestions.search(userId, q) : []), {
        query: searchQuery,
      })
      .get(
        "/exercises/:name/progress",
        ({ params: { name }, query, userId }) => workout.exercises.progress(userId, name, query.equipment),
        { params: t.Object({ name: t.String() }), query: t.Object({ equipment: t.Optional(t.String()) }) },
      )
      .post(
        "/exercises/merge",
        ({ body, userId }) => workout.exercises.merge(userId, body.sourceName, body.targetName),
        { body: t.Object({ sourceName: t.String(), targetName: t.String() }) },
      ),
  )
  .group("/api/measurements", (app) =>
    app
      .use(workoutAuth)
      .get("/", ({ userId }) => workout.measurements.list(userId))
      .get("/latest", ({ userId }) => workout.measurements.getLatest(userId))
      .post("/", ({ body, userId }) => workout.measurements.save(userId, body), { body: measurementSaveBody })
      .put("/:id", ({ params: { id }, body, userId }) => workout.measurements.update(userId, id, body), {
        params: idParams,
        body: measurementUpdateBody,
      })
      .delete("/:id", ({ params: { id }, userId }) => workout.measurements.remove(id, userId), { params: idParams })
      .post(
        "/:id/photos",
        ({ params: { id }, body, userId }) => workout.measurements.addPhoto(id, userId, body.filePath),
        { params: idParams, body: t.Object({ filePath: t.String() }) },
      )
      .post(
        "/upload",
        async ({ body }) => {
          const { filename } = await saveUpload(body, "measurement_", IMAGE_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}` };
        },
        { body: t.Object({ file: t.File() }) },
      )
      .delete(
        "/photos/:photoId",
        ({ params: { photoId }, userId }) => workout.measurements.deletePhoto(photoId, userId),
        {
          params: t.Object({ photoId: t.Numeric() }),
        },
      ),
  )
  .get(
    "/api/uploads/:filename",
    async ({ params: { filename }, cookie: { session_id }, request }) => {
      let sid = typeof session_id?.value === "string" ? session_id.value : "";
      if (!sid) {
        const cookieHeader = request.headers.get("cookie") || "";
        const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
        if (match) sid = match[1];
      }
      const sessionInfo = sid ? auth.validateSession(sid) : null;
      if (!sessionInfo) throw new AppError(401, "Unauthorized");
      if (!UPLOAD_NAME_PATTERN.test(filename) || filename.startsWith("resume_")) throw new NotFoundError();
      if (workout.measurements.isForeignPhoto(sessionInfo.userId, filename)) throw new NotFoundError();
      const file = Bun.file(join(import.meta.dir, "../../uploads", filename));
      if (!(await file.exists())) throw new NotFoundError();
      return new Response(file, { headers: uploadResponseHeaders(filename) });
    },
    { params: t.Object({ filename: t.String() }) },
  );
