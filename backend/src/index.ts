import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthService } from "./auth";
import { RecipeService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";

const PORT = 3001;
const auth = new AuthService();
const recipes = new RecipeService();
const workout = new WorkoutService();

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

const app = new Elysia()
  .use(cors({ origin: "http://localhost:3000", credentials: true }))
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
    session_id?.set({ value: sessionId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });

    return { user: { id: result.userId, username } };
  })

  .get("/api/auth/logout", ({ cookie: { session_id } }) => {
    if (session_id?.value) auth.deleteSession(session_id.value);
    session_id?.set({ value: "", maxAge: 0 });
    return { ok: true };
  })

  .get("/api/auth/me", ({ cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid) return new Response("Unauthorized", { status: 401 });
    const user = auth.validateSession(sid);
    if (!user) return new Response("Unauthorized", { status: 401 });
    return { user: { id: user.userId, username: user.username } };
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

  .listen(PORT);

console.log(`Backend running on http://localhost:${PORT}`);

