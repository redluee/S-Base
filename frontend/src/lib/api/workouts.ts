import { request as clientRequest, type Fetcher } from "./core";
import type { FullWorkoutSession, PersonalRecord } from "@backend/types/shared";
import type {
  ExerciseListItem,
  ExerciseProgressData,
  ExerciseSuggestion,
  FullWorkoutTemplate,
  SearchSuggestion,
  WorkoutSession,
  WorkoutStatsSummary,
  WorkoutTemplate,
} from "@backend/types/workout";
import type { SessionStatusFilter } from "@backend/shared/workout";

export const createWorkoutsApi = (request: Fetcher) => ({
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
    list: (status?: SessionStatusFilter, q?: string) => {
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
    list: () => request<ExerciseListItem[]>("/workouts/exercises"),
    suggest: (q: string) =>
      request<ExerciseSuggestion[]>(
        `/workouts/exercises/suggest?q=${encodeURIComponent(q)}`,
      ),

    progress: (name: string, equipment?: string) =>
      request<ExerciseProgressData>(
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
    request<SearchSuggestion[]>(
      `/workouts/suggest?q=${encodeURIComponent(q)}`,
    ),
  stats: () =>
    request<WorkoutStatsSummary>("/workouts/stats"),
});

export const workoutsApi = createWorkoutsApi(clientRequest);
