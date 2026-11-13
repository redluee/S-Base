import { request as clientRequest, type Fetcher } from "./core";

export const createIngredientsApi = (request: Fetcher) => ({
  search: (q: string) =>
    request<{ ingredientId: number; name: string }[]>(
      `/ingredients/search?q=${encodeURIComponent(q)}`,
    ),
});

export const ingredientsApi = createIngredientsApi(clientRequest);
