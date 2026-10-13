import { Elysia } from "elysia";
import { IMAGE_EXTENSIONS } from "../utils/uploads";
import { recipes, wineService, recipeAuth, validated, saveUpload } from "../context";

export const recipeRoutes = new Elysia()
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
        return validated(async () => {
          const { filename } = await saveUpload(body, "wine_", IMAGE_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}` };
        });
      })
  );
