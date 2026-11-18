import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { canOpen, moduleById, type ModuleId } from "@/lib/modules";
import { BACKEND_API_URL, SESSION_COOKIE } from "@/lib/backend";
import { createCashflowApi } from "@/lib/api/cashflow";
import { createMeasurementsApi } from "@/lib/api/measurements";
import { createMinecraftApi } from "@/lib/api/minecraft";
import { createPulseApi } from "@/lib/api/pulse";
import { createMinorApi } from "@/lib/api/minor";
import { createRecipesApi } from "@/lib/api/recipes";
import { createResumeApi } from "@/lib/api/resume";
import { createWinesApi } from "@/lib/api/wines";
import { createWorkoutsApi } from "@/lib/api/workouts";
import { createTodoApi } from "@/lib/api/todo";
import type { AuthUser } from "@/lib/api";


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

  recipes: createRecipesApi(serverFetch),

  workouts: createWorkoutsApi(serverFetch),

  measurements: createMeasurementsApi(serverFetch),

  wines: createWinesApi(serverFetch),

  cashflow: createCashflowApi(serverFetch),

  pulse: createPulseApi(serverFetch),
  minecraft: createMinecraftApi(serverFetch),
  resume: createResumeApi(serverFetch),
  minor: createMinorApi(serverFetch),
  todo: createTodoApi(serverFetch),
};
