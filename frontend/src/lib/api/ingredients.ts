import { request } from "./core";

export const ingredientsApi = {
  search: (q: string) =>
    request<{ ingredientId: number; name: string }[]>(
      `/ingredients/search?q=${encodeURIComponent(q)}`,
    ),
};
