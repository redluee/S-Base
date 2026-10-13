import { Elysia } from "elysia";
import { and } from "drizzle-orm";
import { join } from "path";
import { IMAGE_EXTENSIONS, UPLOAD_NAME_PATTERN, uploadResponseHeaders } from "../utils/uploads";
import { requireId } from "../utils/validation";
import { auth, workout, measurements, workoutAuth, validated, saveUpload, notFoundOr } from "../context";

export const workoutRoutes = new Elysia()
  // --- Workout routes ---
  .group("/api/workouts", (app) =>
    app
      .use(workoutAuth)
      .get("/templates", ({ userId }) => {
        return workout.listTemplates(userId);
      })
      .patch("/templates/reorder", async ({ body, userId }) => {
        const { templateIds } = body as { templateIds: number[] };
        return validated(() => workout.reorderTemplates(userId, templateIds));
      })
      .get("/templates/:id", ({ params: { id }, userId }) => {
        const t = workout.getTemplate(Number(id), userId);
        if (!t) return new Response("Not Found", { status: 404 });
        return t;
      })
      .post("/templates", async ({ body, userId }) => {
        return validated(() => workout.createTemplate(userId, body as any));
      })
      .put("/templates/:id", async ({ params: { id }, body, userId }) => {
        return validated(() => notFoundOr(workout.updateTemplate(Number(id), userId, body as any)));
      })
      .delete("/templates/:id", async ({ params: { id }, userId }) => {
        const res = workout.deleteTemplate(Number(id), userId);
        if (!res) return new Response("Not Found", { status: 404 });
        return res;
      })
      .get("/sessions", ({ query, userId }) => {
        const status = query?.status as string | undefined;
        const q = query?.q as string | undefined;
        return workout.listSessions(userId, status, q);
      })
      .get("/sessions/:id", ({ params: { id }, userId }) => {
        const s = workout.getSession(Number(id), userId);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .get("/sessions/:id/prs", ({ params: { id }, query, userId }) => {
        const raw = query?.duration;
        const parsed = raw !== undefined && raw !== "" ? Number(raw) : undefined;
        const duration = parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
        return workout.getSessionPRs(Number(id), userId, duration);
      })
      .post("/sessions", async ({ body, userId }) => {
        const { templateId, force } = (body ?? {}) as any;
        return validated(() => workout.createSession(userId, templateId ? Number(templateId) : undefined, force === true));
      })
      .patch("/sessions/:id", async ({ params: { id }, body, userId }) => {
        return validated(() => notFoundOr(workout.updateSession(Number(id), userId, body as any)));
      })
      .patch("/sessions/:id/complete", async ({ params: { id }, body, userId }) => {
        const { completedAt } = (body ?? {}) as any;
        return validated(() => notFoundOr(workout.completeSession(Number(id), userId, completedAt)));
      })
      .delete("/sessions/:id", async ({ params: { id }, userId }) => {
        const res = workout.deleteSession(Number(id), userId);
        if (!res) return new Response("Not Found", { status: 404 });
        return res;
      })
      .get("/exercises", ({ userId }) => {
        return workout.listUniqueExercises(userId);
      })
      .get("/stats", ({ userId }) => {
        return workout.getStats(userId);
      })
      .get("/exercises/suggest", ({ query, userId }) => {
        const q = query?.q as string | undefined;
        if (!q || q.length < 1) return [];
        return workout.suggestExercises(userId, q);
      })
      .get("/suggest", ({ query, userId }) => {
        const q = query?.q as string | undefined;
        if (!q || q.length < 1) return [];
        return workout.suggestWorkoutSearch(userId, q);
      })
      .get("/exercises/:name/progress", ({ params: { name }, query, userId }) => {
        return workout.exerciseProgress(userId, name, query?.equipment as string | undefined);
      })
      .post("/exercises/merge", async ({ body, userId }) => {
        const { sourceName, targetName } = (body || {}) as { sourceName: string; targetName: string };
        if (!sourceName || !targetName) {
          return new Response(JSON.stringify({ error: "Source and target exercise names are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return validated(() => workout.mergeExercises(userId, sourceName, targetName));
      })
  )
  
  // --- Measurements routes ---
  .group("/api/measurements", (app) =>
    app
      .use(workoutAuth)
      .get("/", ({ userId }) => {
        return measurements.list(userId);
      })
      .get("/latest", ({ userId }) => {
        return measurements.getLatest(userId);
      })
      .post("/", async ({ body, userId }) => {
        return validated(() => measurements.save(userId, body as any));
      })
      .put("/:id", async ({ params: { id }, body, userId }) => {
        return validated(() => notFoundOr(measurements.update(userId, id, body as any)));
      })
      .delete("/:id", async ({ params: { id }, userId }) => {
        return validated(async () => {
          const success = await measurements.deleteMeasurement(requireId(id, "Measurement id"), userId);
          if (!success) return new Response("Not Found", { status: 404 });
          return { success: true };
        });
      })
      .post("/:id/photos", async ({ params: { id }, body, userId }) => {
        return validated(() => {
          const { filePath } = (body ?? {}) as { filePath?: unknown };
          return notFoundOr(measurements.addPhoto(requireId(id, "Measurement id"), userId, filePath));
        });
      })
      .post("/upload", async ({ body }) => {
        return validated(async () => {
          const { filename } = await saveUpload(body, "measurement_", IMAGE_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}` };
        });
      })
      .delete("/photos/:photoId", async ({ params: { photoId }, userId }) => {
        return validated(async () => {
          const success = await measurements.deletePhoto(requireId(photoId, "Photo id"), userId);
          if (!success) return new Response("Not Found or Forbidden", { status: 404 });
          return { success: true };
        });
      })
  )

  // Serve uploads
  .get("/api/uploads/:filename", async ({ params: { filename }, cookie: { session_id }, request }) => {
    let sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
      if (match) sid = match[1];
    }
    if (!sid || !auth.validateSession(sid)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const sessionInfo = auth.validateSession(sid);
    if (!UPLOAD_NAME_PATTERN.test(filename) || filename.startsWith("resume_")) {
      return new Response("Not Found", { status: 404 });
    }
    const photoOwnership = measurements.ownsPhotoFile(sessionInfo!.userId, filename);
    if (photoOwnership === false) return new Response("Not Found", { status: 404 });
    const file = Bun.file(join(import.meta.dir, "../../uploads", filename));
    if (await file.exists()) {
      return new Response(file, { headers: uploadResponseHeaders(filename) });
    }
    return new Response("Not Found", { status: 404 });
  });
