async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = await res.json();
      message = json.error || message;
    } catch {
      message = await res.text() || message;
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: { id: number; username: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout"),

  me: () =>
    request<{ user: { id: number; username: string } }>("/auth/me"),

  ingredients: {
    search: (q: string) =>
      request<{ ingredientId: number; name: string }[]>(
        `/ingredients/search?q=${encodeURIComponent(q)}`,
      ),
  },

  recipes: {
    list: (status?: string, sortBy?: string, sortOrder?: string, q?: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      if (q) params.set("q", q);
      const qs = params.toString();
      return request<any[]>(`/recipes${qs ? `?${qs}` : ""}`);
    },
    suggest: (q: string) =>
      request<{ type: "recipe" | "ingredient" | "kitchen"; value: string }[]>(
        `/recipes/suggest?q=${encodeURIComponent(q)}`,
      ),

    get: (id: number) => request<any>(`/recipes/${id}`),

    create: (data: any) =>
      request<any>("/recipes", { method: "POST", body: JSON.stringify(data) }),

    update: (id: number, data: any) =>
      request<any>(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),

    delete: (id: number) =>
      request<any>(`/recipes/${id}`, { method: "DELETE" }),

    updateStatus: (id: number, status: string) =>
      request<any>(`/recipes/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    updateRating: (id: number, rating: number) =>
      request<any>(`/recipes/${id}/rating`, {
        method: "PATCH",
        body: JSON.stringify({ rating }),
      }),
  },
};
