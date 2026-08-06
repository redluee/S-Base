import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthService } from "./auth";
import { RecipeService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";
import { MeasurementService } from "./modules/measurements";
import { WineService } from "./modules/wines";
import db from "./db/client";
import { modules, usermodulepermissions, users } from "./db/schema";
import { eq, and } from "drizzle-orm";
import { join } from "path";
import { mkdir } from "fs/promises";

const PORT = 3001;
const auth = new AuthService();
const recipes = new RecipeService();
const workout = new WorkoutService();
const measurements = new MeasurementService();
const wineService = new WineService();

// Auto-register measurements module and grant access to existing users
try {
  const hasModule = db.select().from(modules).where(eq(modules.moduleName, "measurements")).get();
  if (!hasModule) {
    db.insert(modules).values({
      moduleName: "measurements",
      moduleAlias: "Metingen",
      description: "Module for body measurements",
    }).run();
    console.log("Registered 'measurements' module in DB.");
  }
  
  const m = db.select().from(modules).where(eq(modules.moduleName, "measurements")).get();
  if (m) {
    const allUsers = db.select().from(users).all();
    for (const u of allUsers) {
      const hasPermission = db.select()
        .from(usermodulepermissions)
        .where(and(eq(usermodulepermissions.userId, u.userId), eq(usermodulepermissions.moduleId, m.moduleId)))
        .get();
      if (!hasPermission) {
        db.insert(usermodulepermissions).values({
          userId: u.userId,
          moduleId: m.moduleId,
        }).run();
        console.log(`Granted 'measurements' permission to user: ${u.username}`);
      }
    }
  }
} catch (e) {
  console.error("Failed to auto-register measurements module:", e);
}


function createAuthPlugin(moduleName: string) {
  return new Elysia({ name: `auth-${moduleName}` })
    .derive({ as: "scoped" }, ({ cookie: { session_id } }) => {
      const sid = session_id?.value;
      if (!sid) return { user: null };
      const sessionInfo = auth.validateSession(sid);
      return { user: sessionInfo };
    })
    .onBeforeHandle({ as: "scoped" }, ({ user }) => {
      if (!user) return new Response("Unauthorized", { status: 401 });
      if (!auth.moduleAccessCheck(user.userId, moduleName)) {
        return new Response("Forbidden", { status: 403 });
      }
    })
    .derive({ as: "scoped" }, ({ user }) => {
      return { userId: user!.userId, username: user!.username };
    });
}

const recipeAuth = createAuthPlugin("recipes");
const workoutAuth = createAuthPlugin("workout");
const measurementsAuth = createAuthPlugin("measurements");

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .onError(({ code, error }) => {
    console.error(`Error ${code}:`, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  })

  // --- Auth routes ---
  .post("/api/auth/login", async ({ body, cookie: { session_id } }) => {
    const { username, password } = body as any;
    const result = await auth.verifyCredentials(username, password);
    if (!result.ok) {
      const status = result.reason === "invalid_input" ? 400 : 401;
      return new Response(JSON.stringify({ error: result.reason }), { status });
    }

    const sessionId = auth.createSession(result.userId);
    const isSecure = process.env.NODE_ENV === "production";
    session_id?.set({ value: sessionId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400, secure: isSecure });

    return { user: { id: result.userId, username, email: result.email } };
  })

  .post("/api/auth/cf-login", ({ body, request }) => {
    const cfEmail = request.headers.get("x-cf-email");
    if (!cfEmail) {
      return new Response(JSON.stringify({ error: "missing_cf_header" }), { status: 400 });
    }
    const { email } = (body ?? {}) as { email?: string };
    if (!email || email !== cfEmail) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), { status: 400 });
    }

    const user = auth.findUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: "no_account", email }), { status: 403 });
    }

    const sessionId = auth.createSession(user.userId);
    const isSecure = process.env.NODE_ENV === "production";
    const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isSecure ? "; Secure" : ""}`;
    return new Response(JSON.stringify({ user: { id: user.userId, username: user.username, email: user.email } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  })

  .get("/api/auth/logout", ({ cookie: { session_id } }) => {
    if (session_id?.value) auth.deleteSession(session_id.value);
    session_id?.set({ value: "", maxAge: 0, path: "/", secure: process.env.NODE_ENV === "production" });
    return { ok: true };
  })

  .get("/api/auth/me", ({ cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid) return new Response("Unauthorized", { status: 401 });
    const user = auth.validateSession(sid);
    if (!user) return new Response("Unauthorized", { status: 401 });
    return { user: { id: user.userId, username: user.username, email: user.email } };
  })

  // --- Ingredient routes ---
  .get("/api/ingredients/search", ({ query }) => {
    const q = query?.q as string | undefined;
    if (!q || q.length < 1) return [];
    return recipes.ingredientSearch(q);
  })

  // --- Recipe GET routes ---
  .get("/api/recipes", ({ query }) => {
    const status = query?.status as string | undefined;
    const sortBy = query?.sortBy as string | undefined;
    const sortOrder = query?.sortOrder as string | undefined;
    const q = query?.q as string | undefined;
    if (q) return recipes.search(q, status, sortBy, sortOrder);
    return recipes.list(status, sortBy, sortOrder);
  })

  .get("/api/recipes/suggest", ({ query }) => {
    const q = query?.q as string | undefined;
    if (!q || q.length < 1) return [];
    return recipes.suggest(q);
  })

  .get("/api/recipes/:id", ({ params: { id } }) => {
    return recipes.getById(Number(id));
  })

  // --- Recipe Mutating routes ---
  .group("/api/recipes", (app) =>
    app
      .use(recipeAuth)
      .post("/", async ({ body }) => recipes.create(body as any))
      .put("/:id", async ({ params: { id }, body }) => recipes.update(Number(id), body as any))
      .delete("/:id", ({ params: { id } }) => recipes.remove(Number(id)))
      .patch("/:id/status", ({ params: { id }, body }) => {
        const { status } = body as any;
        return recipes.updateStatus(Number(id), status);
      })
      .patch("/:id/rating", ({ params: { id }, body }) => {
        const { rating } = body as any;
        return recipes.updateRating(Number(id), rating);
      })
  )
  // --- Wine routes ---
  .group("/api/wines", (app) =>
    app
      .use(recipeAuth)
      .get("/", ({ userId, query }) => {
        const type = query?.type as string | undefined;
        const q = query?.q as string | undefined;
        const sortBy = query?.sortBy as string | undefined;
        const sortOrder = query?.sortOrder as string | undefined;
        return wineService.list(userId, type, q, sortBy, sortOrder);
      })
      .get("/:id", ({ params: { id } }) => {
        const item = wineService.getById(Number(id));
        if (!item) return new Response("Not Found", { status: 404 });
        return item;
      })
      .post("/", async ({ userId, body }) => {
        return wineService.create(userId, body as any);
      })
      .put("/:id", async ({ params: { id }, body }) => {
        const item = wineService.update(Number(id), body as any);
        if (!item) return new Response("Not Found", { status: 404 });
        return item;
      })
      .delete("/:id", ({ params: { id } }) => {
        const success = wineService.remove(Number(id));
        if (!success) return new Response("Not Found", { status: 404 });
        return { success: true };
      })
      .post("/upload", async ({ body }) => {
        const { file } = (body ?? {}) as any;
        if (!file) {
          return new Response("No file uploaded", { status: 400 });
        }
        const uploadsDir = join(import.meta.dir, "../uploads");
        await mkdir(uploadsDir, { recursive: true });

        const ext = file.name ? file.name.split(".").pop() : "jpg";
        const filename = `wine_${crypto.randomUUID()}.${ext}`;
        const filePath = join(uploadsDir, filename);

        await Bun.write(filePath, file);
        return { filePath: `/api/uploads/${filename}` };
      })
  )

  // --- Workout routes ---
  .group("/api/workouts", (app) =>
    app
      .use(workoutAuth)
      .get("/templates", ({ userId }) => {
        return workout.listTemplates(userId);
      })
      .get("/templates/:id", ({ params: { id }, userId }) => {
        const t = workout.getTemplate(Number(id), userId);
        if (!t) return new Response("Not Found", { status: 404 });
        return t;
      })
      .post("/templates", async ({ body, userId }) => {
        return workout.createTemplate(userId, body as any);
      })
      .put("/templates/:id", async ({ params: { id }, body, userId }) => {
        const t = workout.updateTemplate(Number(id), userId, body as any);
        if (!t) return new Response("Not Found", { status: 404 });
        return t;
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
        const duration = query?.duration ? Number(query.duration) : undefined;
        return workout.getSessionPRs(Number(id), userId, duration);
      })
      .post("/sessions", async ({ body, userId }) => {
        const { templateId } = (body ?? {}) as any;
        return workout.createSession(userId, templateId ? Number(templateId) : undefined);
      })
      .patch("/sessions/:id", async ({ params: { id }, body, userId }) => {
        const s = workout.updateSession(Number(id), userId, body as any);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .patch("/sessions/:id/complete", async ({ params: { id }, body, userId }) => {
        const { completedAt } = (body ?? {}) as any;
        const s = workout.completeSession(Number(id), userId, completedAt);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
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
        return workout.exerciseProgress(userId, decodeURIComponent(name), query?.equipment as string | undefined);
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
        return measurements.save(userId, body as any);
      })
      .delete("/:id", async ({ params: { id }, userId }) => {
        const success = await measurements.deleteMeasurement(Number(id), userId);
        if (!success) return new Response("Not Found", { status: 404 });
        return { success: true };
      })
      .post("/:id/photos", async ({ params: { id }, body }) => {
        const { filePath } = body as { filePath: string };
        return measurements.addPhoto(Number(id), filePath);
      })
      .post("/upload", async ({ body }) => {
        const { file } = (body ?? {}) as any;
        if (!file) {
          return new Response("No file uploaded", { status: 400 });
        }
        const uploadsDir = join(import.meta.dir, "../uploads");
        await mkdir(uploadsDir, { recursive: true });
        
        const ext = file.name ? file.name.split(".").pop() : "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const filePath = join(uploadsDir, filename);
        
        await Bun.write(filePath, file);
        return { filePath: `/api/uploads/${filename}` };
      })
      .delete("/photos/:photoId", async ({ params: { photoId }, userId }) => {
        const success = await measurements.deletePhoto(Number(photoId), userId);
        if (!success) return new Response("Not Found or Forbidden", { status: 404 });
        return { success: true };
      })
  )

  // Serve uploads
  .get("/api/uploads/:filename", async ({ params: { filename } }) => {
    const filePath = join(import.meta.dir, "../uploads", filename);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  })

  .listen({ port: PORT, hostname: "0.0.0.0" });

console.log(`Backend running on http://localhost:${PORT}`);

