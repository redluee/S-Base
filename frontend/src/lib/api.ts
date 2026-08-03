import type {
  Recipe,
  FullRecipe,
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
  PersonalRecord,
} from "@backend/types/shared";

export interface MeasurementPhoto {
  photoId: number;
  measurementId: number;
  filePath: string;
  createdAt: string;
}

export interface Measurement {
  measurementId: number;
  userId: number;
  date: string;
  height: number | null;
  weight: number | null;
  bodyFat: number | null;
  skeletalMuscle: number | null;
  fatMass: number | null;
  createdAt: string;
  photos: MeasurementPhoto[];
}

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
      const text = await res.clone().text();
      try {
        const json = JSON.parse(text);
        message = json.error || message;
      } catch {
        message = text || message;
      }
    } catch {
      // fallback if cloning/text reading fails
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
  },

  workouts: {
    templates: {
      list: () => request<WorkoutTemplate[]>("/workouts/templates"),

      get: (id: number) => request<FullWorkoutTemplate>(`/workouts/templates/${id}`),

      create: (data: unknown) =>
        request<FullWorkoutTemplate>("/workouts/templates", { method: "POST", body: JSON.stringify(data) }),

      update: (id: number, data: unknown) =>
        request<FullWorkoutTemplate>(`/workouts/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),

      delete: (id: number) =>
        request<{ deleted: boolean }>(`/workouts/templates/${id}`, { method: "DELETE" }),
    },

    sessions: {
      list: (status?: string, q?: string) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (q) params.set("q", q);
        const qs = params.toString();
        return request<WorkoutSession[]>(`/workouts/sessions${qs ? `?${qs}` : ""}`);
      },

      get: (id: number) => request<FullWorkoutSession>(`/workouts/sessions/${id}`),

      create: (templateId?: number) =>
        request<FullWorkoutSession>("/workouts/sessions", {
          method: "POST",
          body: JSON.stringify({ templateId }),
        }),

      update: (id: number, data: unknown) =>
        request<FullWorkoutSession>(`/workouts/sessions/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),

      complete: (id: number, completedAt?: string) =>
        request<FullWorkoutSession>(`/workouts/sessions/${id}/complete`, {
          method: "PATCH",
          body: completedAt ? JSON.stringify({ completedAt }) : undefined,
        }),

      getPRs: (id: number, duration?: number) =>
        request<PersonalRecord[]>(`/workouts/sessions/${id}/prs${duration !== undefined ? `?duration=${duration}` : ""}`),

      delete: (id: number) =>
        request<{ deleted: boolean }>(`/workouts/sessions/${id}`, { method: "DELETE" }),
    },

    exercises: {
      list: () => request<{ name: string; equipment: string | null; equipments?: string[] }[]>("/workouts/exercises"),
      suggest: (q: string) =>
        request<{
          type: string;
          value: string;
          category?: string;
          defaultSets: number | null;
          defaultReps: number | null;
          defaultWeight?: number | null;
          defaultDistance?: number | null;
          defaultDuration?: number | null;
          defaultRestTime?: number | null;
          equipment: string | null;
        }[]>(
          `/workouts/exercises/suggest?q=${encodeURIComponent(q)}`,
        ),

      progress: (name: string, equipment?: string) =>
        request<{
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
    suggest: (q: string) =>
      request<{
        type: "exercise" | "template" | "history";
        value: string;
        rawValue?: string;
        equipment?: string | null;
        id?: number;
      }[]>(
        `/workouts/suggest?q=${encodeURIComponent(q)}`,
      ),
    stats: () =>
      request<{ daysAgo: number | null; totalWorkouts: number; totalVolume: number }>("/workouts/stats"),
  },

  measurements: {
    list: () =>
      request<Measurement[]>("/measurements"),
    latest: () =>
      request<Measurement | null>("/measurements/latest"),
    save: (data: Partial<Measurement>) =>
      request<Measurement>("/measurements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/measurements/${id}`, {
        method: "DELETE",
      }),
    uploadPhoto: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/measurements/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res.json() as Promise<{ filePath: string }>;
    },
    deletePhoto: (photoId: number) =>
      request<{ success: boolean }>(`/measurements/photos/${photoId}`, {
        method: "DELETE",
      }),
  },
};

