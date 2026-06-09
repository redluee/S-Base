import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthService } from "./auth";
import { RecipeService } from "./modules/recipes";

const PORT = 3001;
const auth = new AuthService();
const recipes = new RecipeService();

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

    const username_ = auth.getUsernameFromSession(sessionId);
    return { user: { id: result.userId, username: username_ } };
  })

  .get("/api/auth/logout", ({ cookie: { session_id } }) => {
    if (session_id?.value) auth.deleteSession(session_id.value);
    session_id?.set({ value: "", maxAge: 0 });
    return { ok: true };
  })

  .get("/api/auth/me", ({ cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid) return new Response("Unauthorized", { status: 401 });
    const username = auth.getUsernameFromSession(sid);
    if (!username) return new Response("Unauthorized", { status: 401 });
    const userId = auth.getUserIdFromSession(sid);
    return { user: { id: userId, username } };
  })

  // --- Ingredient routes ---
  .get("/api/ingredients/search", ({ query }) => {
    const q = query?.q as string | undefined;
    if (!q || q.length < 1) return [];
    return recipes.ingredientSearch(q);
  })

  // --- Recipe routes ---
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

  .post("/api/recipes", async ({ body, cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid || !auth.verifySession(sid)) return new Response("Unauthorized", { status: 401 });
    if (!auth.moduleAccessCheck(sid, "recipes")) return new Response("Forbidden", { status: 403 });
    return recipes.create(body as any);
  })

  .put("/api/recipes/:id", async ({ params: { id }, body, cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid || !auth.verifySession(sid)) return new Response("Unauthorized", { status: 401 });
    if (!auth.moduleAccessCheck(sid, "recipes")) return new Response("Forbidden", { status: 403 });
    return recipes.update(Number(id), body as any);
  })

  .delete("/api/recipes/:id", ({ params: { id }, cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid || !auth.verifySession(sid)) return new Response("Unauthorized", { status: 401 });
    if (!auth.moduleAccessCheck(sid, "recipes")) return new Response("Forbidden", { status: 403 });
    return recipes.remove(Number(id));
  })

  .patch("/api/recipes/:id/status", ({ params: { id }, body, cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid || !auth.verifySession(sid)) return new Response("Unauthorized", { status: 401 });
    if (!auth.moduleAccessCheck(sid, "recipes")) return new Response("Forbidden", { status: 403 });
    const { status } = body as any;
    return recipes.updateStatus(Number(id), status);
  })

  .patch("/api/recipes/:id/rating", ({ params: { id }, body, cookie: { session_id } }) => {
    const sid = session_id?.value;
    if (!sid || !auth.verifySession(sid)) return new Response("Unauthorized", { status: 401 });
    if (!auth.moduleAccessCheck(sid, "recipes")) return new Response("Forbidden", { status: 403 });
    const { rating } = body as any;
    return recipes.updateRating(Number(id), rating);
  })

  .listen(PORT);

console.log(`Backend running on http://localhost:${PORT}`);
