import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthService } from "./auth";
import { RecipeService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";
import { MeasurementService } from "./modules/measurements";
import { WineService } from "./modules/wines";
import { CashflowService } from "./modules/cashflow";
import { PulseService } from "./modules/pulse";
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
const cashflow = new CashflowService();
const pulse = new PulseService();

function createAuthPlugin(moduleName: string) {
  return new Elysia({ name: `auth-${moduleName}` })
    .derive({ as: "scoped" }, ({ cookie: { session_id } }) => {
      const sid = typeof session_id?.value === "string" ? session_id.value : "";
      if (!sid) return { user: null };
      const sessionInfo = auth.validateSession(sid);
      return { user: sessionInfo };
    })
    .onBeforeHandle({ as: "scoped" }, ({ user }) => {
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!auth.moduleAccessCheck(user.userId, moduleName)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    })
    .derive({ as: "scoped" }, ({ user }) => {
      return { userId: user!.userId, username: user!.username };
    });
}

const recipeAuth = createAuthPlugin("recipes");
const workoutAuth = createAuthPlugin("workout");
const measurementsAuth = workoutAuth;
const cashflowAuth = createAuthPlugin("cashflow");
const pulseAuth = createAuthPlugin("pulse");

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .onError(({ code, error }) => {
    console.error(`Error ${code}:`, error);
    const message = error && typeof error === "object" && "message" in error ? (error as { message: string }).message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })

  // --- Auth routes ---
  .post("/api/auth/login", async ({ body, cookie: { session_id } }) => {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await auth.verifyCredentials(username, password);
    if (!result.ok) {
      if (result.reason === "account_paused") {
        return new Response(
          JSON.stringify({
            error: "account_paused",
            message: "Uw account is gepauzeerd. Neem contact op met de beheerder.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const status = result.reason === "invalid_input" ? 400 : 401;
      return new Response(JSON.stringify({ error: result.reason }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId = auth.createSession(result.userId);
    const isSecure = process.env.NODE_ENV === "production";
    session_id?.set({ value: sessionId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400, secure: isSecure });

    return { user: { id: result.userId, username, email: result.email, modules: auth.getUserModules(result.userId) } };
  })

  .post("/api/auth/cf-login", ({ body, request }) => {
    const cfEmail = request.headers.get("x-cf-email");
    if (!cfEmail) {
      return new Response(JSON.stringify({ error: "missing_cf_header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { email } = (body ?? {}) as { email?: string };
    if (!email || email !== cfEmail) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = auth.findUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: "no_account", email }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (user.isPaused === 1) {
      return new Response(
        JSON.stringify({
          error: "account_paused",
          message: "Uw account is gepauzeerd. Neem contact op met de beheerder.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    auth.logLastLogin(user.userId);
    const sessionId = auth.createSession(user.userId);
    const isSecure = process.env.NODE_ENV === "production";
    const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isSecure ? "; Secure" : ""}`;
    return new Response(JSON.stringify({ user: { id: user.userId, username: user.username, email: user.email, modules: auth.getUserModules(user.userId) } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  })

  .get("/api/auth/logout", ({ cookie: { session_id } }) => {
    const sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (sid) auth.deleteSession(sid);
    session_id?.set({ value: "", maxAge: 0, path: "/", secure: process.env.NODE_ENV === "production" });
    return { ok: true };
  })

  .get("/api/auth/me", ({ cookie: { session_id } }) => {
    const sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const user = auth.validateSession(sid);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return { user: { id: user.userId, username: user.username, email: user.email, modules: auth.getUserModules(user.userId) } };
  })

  // --- Ingredient routes ---
  .group("/api/ingredients", (app) =>
    app
      .use(recipeAuth)
      .get("/search", ({ query }) => {
        const q = query?.q as string | undefined;
        if (!q || q.length < 1) return [];
        return recipes.ingredientSearch(q);
      })
  )

  // --- Recipe routes ---
  .group("/api/recipes", (app) =>
    app
      .use(recipeAuth)
      .get("/", ({ query }) => {
        const status = query?.status as string | undefined;
        const sortBy = query?.sortBy as string | undefined;
        const sortOrder = query?.sortOrder as string | undefined;
        const q = query?.q as string | undefined;
        if (q) return recipes.search(q, status, sortBy, sortOrder);
        return recipes.list(status, sortBy, sortOrder);
      })
      .get("/suggest", ({ query }) => {
        const q = query?.q as string | undefined;
        if (!q || q.length < 1) return [];
        return recipes.suggest(q);
      })
      .get("/:id", ({ params: { id } }) => {
        return recipes.getById(Number(id));
      })
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
      .post("/exercises/merge", async ({ body, userId }) => {
        const { sourceName, targetName } = (body || {}) as { sourceName: string; targetName: string };
        if (!sourceName || !targetName) {
          return new Response(JSON.stringify({ error: "Source and target exercise names are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          return workout.mergeExercises(userId, sourceName, targetName);
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || "Failed to merge exercises" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
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
  .get("/api/uploads/:filename", async ({ params: { filename }, cookie: { session_id } }) => {
    const sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid || !auth.validateSession(sid)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const filePath = join(import.meta.dir, "../uploads", filename);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  })

  // --- Cashflow routes ---
  .group("/api/cashflow", (app) =>
    app
      .use(cashflowAuth)
      .get("/trade-names", ({ userId }) => cashflow.listTradeNames(userId))
      .post("/trade-names", async ({ userId, body }) => cashflow.createTradeName(userId, body as any))
      .put("/trade-names/:id", async ({ params: { id }, body }) => cashflow.updateTradeName(Number(id), body as any))
      .delete("/trade-names/:id", ({ params: { id } }) => {
        const r = cashflow.removeTradeName(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/clients", ({ userId }) => cashflow.listClients(userId))
      .post("/clients", async ({ userId, body }) => cashflow.createClient(userId, body as any))
      .get("/clients/:id", ({ params: { id } }) => {
        const c = cashflow.getClientById(Number(id));
        if (!c) return new Response("Not Found", { status: 404 });
        return c;
      })
      .put("/clients/:id", async ({ params: { id }, body }) => {
        const c = cashflow.updateClient(Number(id), body as any);
        if (!c) return new Response("Not Found", { status: 404 });
        return c;
      })
      .delete("/clients/:id", ({ params: { id } }) => {
        const r = cashflow.removeClient(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/projects", ({ userId, query }) => {
        const clientId = query?.clientId ? Number(query.clientId) : undefined;
        return cashflow.listProjects(userId, clientId);
      })
      .post("/projects", async ({ userId, body }) => cashflow.createProject(userId, body as any))
      .get("/projects/:id", ({ params: { id } }) => {
        const p = cashflow.getProjectById(Number(id));
        if (!p) return new Response("Not Found", { status: 404 });
        return p;
      })
      .put("/projects/:id", async ({ params: { id }, body }) => {
        const p = cashflow.updateProject(Number(id), body as any);
        if (!p) return new Response("Not Found", { status: 404 });
        return p;
      })
      .delete("/projects/:id", ({ params: { id }, query }) => {
        const deleteInvoices = query?.deleteInvoices === "true";
        const r = cashflow.removeProject(Number(id), deleteInvoices);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/invoices/next-number", ({ userId }) => {
        const year = new Date().getFullYear();
        return { invoiceNumber: cashflow.generateInvoiceNumber(userId, year) };
      })
      .get("/invoices", ({ userId, query }) => {
        const status = query?.status as string | undefined;
        const projectId = query?.projectId ? Number(query.projectId) : undefined;
        const clientId = query?.clientId ? Number(query.clientId) : undefined;
        return cashflow.listInvoices(userId, status, projectId, clientId);
      })
      .post("/invoices", async ({ userId, body }) => cashflow.createInvoice(userId, body as any))
      .get("/invoices/:id", ({ params: { id } }) => {
        const inv = cashflow.getInvoiceById(Number(id));
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .put("/invoices/:id", async ({ params: { id }, body }) => {
        const inv = cashflow.updateInvoice(Number(id), body as any);
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .delete("/invoices/:id", ({ params: { id } }) => {
        const r = cashflow.removeInvoice(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .patch("/invoices/:id/paid", async ({ params: { id }, body }) => {
        const datePaid = (body as any)?.datePaid !== undefined ? ((body as any).datePaid ? Number((body as any).datePaid) : null) : undefined;
        const inv = cashflow.markAsPaid(Number(id), datePaid);
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .get("/dashboard", ({ userId, query }) => cashflow.getDashboardStats(userId, (query as any)?.year ? Number((query as any).year) : undefined))
  )

  // --- Pulse Admin / Monitoring routes ---
  .group("/api/pulse", (app) =>
    app
      .use(pulseAuth)
      .get("/users", () => pulse.listUsers())
      .get("/modules", () => pulse.listModules())
      .get("/stats", () => pulse.getStats())
      .put("/users/:id/email", ({ params: { id }, body }) => {
        const { email } = (body ?? {}) as { email?: string | null };
        const u = pulse.updateEmail(Number(id), email ?? null);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .put("/users/:id/status", ({ params: { id }, body }) => {
        const { isPaused } = (body ?? {}) as { isPaused?: number | boolean };
        const u = pulse.updateStatus(Number(id), isPaused ? 1 : 0);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .put("/users/:id/modules", ({ params: { id }, body }) => {
        const { modules } = (body ?? {}) as { modules?: string[] };
        const u = pulse.updateModules(Number(id), Array.isArray(modules) ? modules : []);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
  )

  .listen({ port: PORT, hostname: "0.0.0.0" });

console.log(`Backend running on http://localhost:${PORT}`);

