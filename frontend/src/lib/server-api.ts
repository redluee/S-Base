import { cookies } from "next/headers";
import { Measurement, Wine } from "./api";
import type {
  Recipe,
  FullRecipe,
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
} from "@backend/types/shared";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001/api";

async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  const cookieHeader = sessionId ? `session_id=${sessionId}` : "";

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
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
  me: () => serverFetch<{ user: { id: number; username: string; email: string | null } }>("/auth/me"),

  recipes: {
    list: (status?: string, sortBy?: string, sortOrder?: string, q?: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      if (q) params.set("q", q);
      const qs = params.toString();
      return serverFetch<Recipe[]>(`/recipes${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => serverFetch<FullRecipe>(`/recipes/${id}`),
  },

  workouts: {
    templates: {
      list: () => serverFetch<WorkoutTemplate[]>("/workouts/templates"),
      get: (id: number) => serverFetch<FullWorkoutTemplate>(`/workouts/templates/${id}`),
    },

    sessions: {
      list: (status?: string, q?: string) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (q) params.set("q", q);
        const qs = params.toString();
        return serverFetch<WorkoutSession[]>(`/workouts/sessions${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => serverFetch<FullWorkoutSession>(`/workouts/sessions/${id}`),
    },

    exercises: {
      list: () => serverFetch<{ name: string; equipment: string | null; equipments?: string[] }[]>("/workouts/exercises"),
      progress: (name: string, equipment?: string) =>
        serverFetch<{
          exerciseName: string;
          category: string;
          equipment: string | null;
          availableEquipments?: string[];
          sessions: {
            sessionId: number;
            startedAt: string;
            equipment?: string | null;
            sets: {
              setNumber: number;
              reps: number | null;
              weight: number | null;
              distance: number | null;
              duration: number | null;
              rpe: number | null;
              heartRate: number | null;
              completed: number;
            }[];
          }[];
        }>(
          `/workouts/exercises/${encodeURIComponent(name)}/progress${
            equipment ? `?equipment=${encodeURIComponent(equipment)}` : ""
          }`,
        ),
    },
    stats: () =>
      serverFetch<{ daysAgo: number | null; totalWorkouts: number; totalVolume: number }>("/workouts/stats"),
  },

  measurements: {
    list: () => serverFetch<Measurement[]>("/measurements"),
    latest: () => serverFetch<Measurement | null>("/measurements/latest"),
  },

  wines: {
    list: (type?: string, q?: string, sortBy?: string, sortOrder?: string) => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (q) params.set("q", q);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const qs = params.toString();
      return serverFetch<Wine[]>(`/wines${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => serverFetch<Wine>(`/wines/${id}`),
  },
};

