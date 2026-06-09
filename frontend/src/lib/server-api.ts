import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  const cookieHeader = sessionId ? `session_id=${sessionId}` : "";

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const serverApi = {
  me: () => serverFetch<{ user: { id: number; username: string } }>("/auth/me"),

  recipes: {
    list: (status?: string, sortBy?: string, sortOrder?: string, q?: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      if (q) params.set("q", q);
      const qs = params.toString();
      return serverFetch<any[]>(`/recipes${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => serverFetch<any>(`/recipes/${id}`),
  },
};
