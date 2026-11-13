import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { canOpen, moduleById, type ModuleId } from "@/lib/modules";
import { BACKEND_API_URL, SESSION_COOKIE } from "@/lib/backend";
import { Measurement, Wine, type AuthUser } from "@/lib/api";
import type {
  Recipe,
  FullRecipe,
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
} from "@backend/types/shared";


async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const cookieHeader = sessionId ? `${SESSION_COOKIE}=${sessionId}` : "";

  const res = await fetch(`${BACKEND_API_URL}${path}`, {
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
    throw new ServerApiError(text || res.statusText, res.status);
  }
  return res.json();
}

export class ServerApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
  }
}

export async function notFoundOn404<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await serverApi.me()).user;
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireModuleUser(id: ModuleId): Promise<AuthUser> {
  const user = await requireUser();
  if (!canOpen(moduleById(id), user.modules)) redirect("/dashboard");
  return user;
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
      get: (id: number) => serverFetch<import("./api").CashflowProjectDetail>(`/cashflow/projects/${id}`),
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
      nextNumber: () => serverFetch<{ invoiceNumber: string }>("/cashflow/invoices/next-number"),
    },
    expenses: {
      list: (options?: { year?: number; category?: string; tradeNameId?: number }) => {
        const params = new URLSearchParams();
        if (options?.year) params.set("year", String(options.year));
        if (options?.category) params.set("category", options.category);
        if (options?.tradeNameId) params.set("tradeNameId", String(options.tradeNameId));
        const qs = params.toString();
        return serverFetch<import("./api").CashflowExpense[]>(`/cashflow/expenses${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => serverFetch<import("./api").CashflowExpense>(`/cashflow/expenses/${id}`),
    },
  },

  pulse: {
    users: () => serverFetch<import("./api").PulseUser[]>("/pulse/users"),
    modules: () => serverFetch<import("./api").PulseModuleInfo[]>("/pulse/modules"),
    stats: () => serverFetch<import("./api").PulseStats>("/pulse/stats"),
    shutdownSchedule: () => serverFetch<import("./api").ShutdownSchedule>("/pulse/shutdown-schedule"),
    systemUpdate: () => serverFetch<import("./api").SystemUpdateState>("/pulse/system-update"),
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
  resume: {
    profile: () => serverFetch<import("@backend/types/shared").ResumeProfile>("/resume/profile"),
    experiences: () => serverFetch<import("@backend/types/shared").ResumeExperience[]>("/resume/experiences"),
    educations: () => serverFetch<import("@backend/types/shared").ResumeEducation[]>("/resume/educations"),
    resumes: {
      list: () => serverFetch<import("@backend/types/shared").Resume[]>("/resume/resumes"),
      get: (id: number) => serverFetch<import("@backend/types/shared").ResumeFull>(`/resume/resumes/${id}`),
    },
  },
  minor: {
    dashboard: () => serverFetch<import("./api").MinorDashboardStats>("/minor/dashboard"),
    sprints: {
      list: () => serverFetch<import("./api").MinorSprint[]>("/minor/sprints"),
      get: (id: number) => serverFetch<import("./api").MinorSprintFull>(`/minor/sprints/${id}`),
      exportJson: (id: number) => serverFetch<import("./api").MinorSprintExportData>(`/minor/sprints/${id}/export`),
    },
    stories: {
      list: () => serverFetch<import("./api").MinorStoryWithSprint[]>("/minor/stories"),
    },
    storyTypes: {
      list: () => serverFetch<import("./api").MinorStoryType[]>("/minor/story-types"),
    },
    vacations: {
      list: () => serverFetch<import("./api").MinorVacation[]>("/minor/vacations"),
    },
    peerHelp: {
      list: () => serverFetch<import("./api").MinorPeerHelp[]>("/minor/peer-help"),
    },
    settings: {
      get: () => serverFetch<import("./api").MinorSettings>("/minor/settings"),
    },
  },
};
