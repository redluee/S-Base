import { Elysia, t } from "elysia";
import { recipeAuth, recipes, saveUpload } from "../context";
import { IMAGE_EXTENSIONS } from "../utils/uploads";

const idParams = t.Object({ id: t.Numeric() });
const searchQuery = t.Object({ q: t.Optional(t.String()) });
const sortQuery = {
  q: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.String()),
};

const ingredientInput = t.Object({
  name: t.String(),
  quantity: t.Number(),
  unit: t.Optional(t.String()),
  sortOrder: t.Optional(t.Number()),
  isOptional: t.Optional(t.Boolean()),
});

const recipeFields = {
  cookingTime: t.Optional(t.Number()),
  kitchen: t.Optional(t.String()),
  status: t.Optional(t.String()),
  description: t.Optional(t.String()),
  rating: t.Optional(t.Number()),
  ingredients: t.Optional(t.Array(ingredientInput)),
  steps: t.Optional(t.Array(t.Object({ description: t.String() }))),
};

const wineFields = {
  vintage: t.Optional(t.Nullable(t.Number())),
  countryRegion: t.Optional(t.Nullable(t.String())),
  purchaseLocation: t.Optional(t.Nullable(t.String())),
  rating: t.Optional(t.Nullable(t.Number())),
  notes: t.Optional(t.Nullable(t.String())),
  imageUrl: t.Optional(t.Nullable(t.String())),
};

export const recipeRoutes = new Elysia()
  .group("/api/ingredients", (app) =>
    app
      .use(recipeAuth)
      .get("/search", ({ query: { q } }) => (q ? recipes.ingredients.search(q) : []), { query: searchQuery }),
  )
  .group("/api/recipes", (app) =>
    app
      .use(recipeAuth)
      .get("/", ({ query }) => recipes.catalog.list(query), {
        query: t.Object({ ...sortQuery, status: t.Optional(t.String()) }),
      })
      .get("/suggest", ({ query: { q } }) => (q ? recipes.catalog.suggest(q) : []), { query: searchQuery })
      .get("/:id", ({ params: { id } }) => recipes.catalog.getById(id), { params: idParams })
      .post("/", ({ body }) => recipes.catalog.create(body), {
        body: t.Object({ name: t.String(), ...recipeFields }),
      })
      .put("/:id", ({ params: { id }, body }) => recipes.catalog.update(id, body), {
        params: idParams,
        body: t.Object({ name: t.Optional(t.String()), ...recipeFields }),
      })
      .delete("/:id", ({ params: { id } }) => recipes.catalog.remove(id), { params: idParams })
      .patch("/:id/status", ({ params: { id }, body }) => recipes.catalog.updateStatus(id, body.status), {
        params: idParams,
        body: t.Object({ status: t.String() }),
      })
      .patch("/:id/rating", ({ params: { id }, body }) => recipes.catalog.updateRating(id, body.rating), {
        params: idParams,
        body: t.Object({ rating: t.Number() }),
      }),
  )
  .group("/api/wines", (app) =>
    app
      .use(recipeAuth)
      .get("/", ({ query }) => recipes.wines.list(query), {
        query: t.Object({ ...sortQuery, type: t.Optional(t.String()) }),
      })
      .get("/:id", ({ params: { id } }) => recipes.wines.getById(id), { params: idParams })
      .post("/", ({ userId, body }) => recipes.wines.create(userId, body), {
        body: t.Object({ brand: t.String(), type: t.String(), variety: t.String(), ...wineFields }),
      })
      .put("/:id", ({ params: { id }, body }) => recipes.wines.update(id, body), {
        params: idParams,
        body: t.Object({
          brand: t.Optional(t.String()),
          type: t.Optional(t.String()),
          variety: t.Optional(t.String()),
          ...wineFields,
        }),
      })
      .delete("/:id", ({ params: { id } }) => recipes.wines.remove(id), { params: idParams })
      .post(
        "/upload",
        async ({ body }) => {
          const { filename } = await saveUpload(body, "wine_", IMAGE_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}` };
        },
        { body: t.Object({ file: t.File() }) },
      ),
  );
