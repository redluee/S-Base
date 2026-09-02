import { cookies } from "next/headers";
import { Measurement, Wine, type AuthUser } from "./api";
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

export async function getCurrentUser() {
  try {
    const { user } = await serverApi.me();
    return user;
  } catch {
    return null;
  }
}

export const serverApi = {
  me: () => serverFetch<{ user: AuthUser }>("/auth/me"),

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

  cashflow: {
    dashboard: (year?: number) => serverFetch<import("./api").CashflowDashboardStats>(year ? `/cashflow/dashboard?year=${year}` : "/cashflow/dashboard"),
    tradeNames: {
      list: () => serverFetch<import("./api").CashflowTradeName[]>("/cashflow/trade-names"),
    },
    clients: {
      list: () => serverFetch<import("./api").CashflowClient[]>("/cashflow/clients"),
    },
    projects: {
      list: (clientId?: number) => {
        const params = new URLSearchParams();
        if (clientId) params.set("clientId", String(clientId));
        const qs = params.toString();
        return serverFetch<import("./api").CashflowProject[]>(`/cashflow/projects${qs ? `?${qs}` : ""}`);
      },
    },
    invoices: {
      list: (status?: string, projectId?: number, clientId?: number) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (projectId) params.set("projectId", String(projectId));
        if (clientId) params.set("clientId", String(clientId));
        const qs = params.toString();
        return serverFetch<import("./api").CashflowInvoiceSummary[]>(`/cashflow/invoices${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => serverFetch<import("./api").CashflowInvoiceFull>(`/cashflow/invoices/${id}`),
    },
  },

  pulse: {
    users: () => serverFetch<import("./api").PulseUser[]>("/pulse/users"),
    modules: () => serverFetch<import("./api").PulseModuleInfo[]>("/pulse/modules"),
    stats: () => serverFetch<import("./api").PulseStats>("/pulse/stats"),
  },

  minecraft: {
    servers: {
      list: () => serverFetch<import("./api").McServer[]>("/minecraft/servers"),
      get: (slug: string) => serverFetch<import("./api").McServer>(`/minecraft/servers/${slug}`),
    },
    templates: {
      list: () => serverFetch<import("./api").McTemplate[]>("/minecraft/templates"),
      get: (id: number) => serverFetch<import("./api").McTemplate>(`/minecraft/templates/${id}`),
    },
    import: {
      scan: () => serverFetch<import("./api").McUnregisteredServerScan[]>("/minecraft/import/scan"),
    },
  },
  minor: {
    dashboard: () => serverFetch<import("./api").MinorDashboardStats>("/minor/dashboard"),
    sprints: {
      list: () => serverFetch<import("./api").MinorSprint[]>("/minor/sprints"),
      get: (id: number) => serverFetch<import("./api").MinorSprintFull>(`/minor/sprints/${id}`),
    },
    stories: {
      list: () => serverFetch<import("./api").MinorStoryWithSprint[]>("/minor/stories"),
    },
    vacations: {
      list: () => serverFetch<import("./api").MinorVacation[]>("/minor/vacations"),
    },
    peerHelp: {
      list: () => serverFetch<import("./api").MinorPeerHelp[]>("/minor/peer-help"),
    },
  },
};
