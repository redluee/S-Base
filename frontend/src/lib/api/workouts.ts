import { request } from "./core";
import type {
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
  PersonalRecord,
} from "@backend/types/shared";

export const workoutsApi = {
  templates: {
    list: () => request<WorkoutTemplate[]>("/workouts/templates"),

    get: (id: number) => request<FullWorkoutTemplate>(`/workouts/templates/${id}`),

    create: (data: unknown) =>
      request<FullWorkoutTemplate>("/workouts/templates", { method: "POST", body: JSON.stringify(data) }),

    update: (id: number, data: unknown) =>
      request<FullWorkoutTemplate>(`/workouts/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),

    delete: (id: number) =>
      request<{ deleted: boolean }>(`/workouts/templates/${id}`, { method: "DELETE" }),

    reorder: (templateIds: number[]) =>
      request<WorkoutTemplate[]>("/workouts/templates/reorder", {
        method: "PATCH",
        body: JSON.stringify({ templateIds }),
      }),
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

    create: (templateId?: number, force = false) =>
      request<FullWorkoutSession>("/workouts/sessions", {
        method: "POST",
        body: JSON.stringify({ templateId, ...(force ? { force: true } : {}) }),
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
        perSide?: number | null;
        isAssisted?: number | null;
        lastSets?: Array<{
          setNumber: number;
          reps?: number | null;
          weight?: number | null;
          distance?: number | null;
          duration?: number | null;
          rpe?: number | null;
          heartRate?: number | null;
        }>;
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

    merge: (sourceName: string, targetName: string) =>
      request<{ success: boolean; sourceName: string; targetName: string }>("/workouts/exercises/merge", {
        method: "POST",
        body: JSON.stringify({ sourceName, targetName }),
      }),
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
};
