import { request as clientRequest, type Fetcher } from "./core";
import type { FullRecipe, Recipe } from "@backend/types/recipes";

export const createRecipesApi = (request: Fetcher) => ({
  list: (status?: string, sortBy?: string, sortOrder?: string, q?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request<Recipe[]>(`/recipes${qs ? `?${qs}` : ""}`);
  },
  suggest: (q: string) =>
    request<{ type: "recipe" | "ingredient" | "kitchen"; value: string }[]>(
      `/recipes/suggest?q=${encodeURIComponent(q)}`,
    ),

  get: (id: number) => request<FullRecipe>(`/recipes/${id}`),

  create: (data: unknown) =>
    request<FullRecipe>("/recipes", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: unknown) =>
    request<FullRecipe>(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<{ deleted: boolean }>(`/recipes/${id}`, { method: "DELETE" }),

  updateStatus: (id: number, status: string) =>
    request<FullRecipe>(`/recipes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateRating: (id: number, rating: number) =>
    request<FullRecipe>(`/recipes/${id}/rating`, {
      method: "PATCH",
      body: JSON.stringify({ rating }),
    }),
});

export const recipesApi = createRecipesApi(clientRequest);
