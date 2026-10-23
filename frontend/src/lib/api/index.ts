import { request } from "./core";
import type { AuthUser } from "./types";
import { ingredientsApi } from "./ingredients";
import { recipesApi } from "./recipes";
import { workoutsApi } from "./workouts";
import { measurementsApi } from "./measurements";
import { winesApi } from "./wines";
import { cashflowApi } from "./cashflow";
import { pulseApi } from "./pulse";
import { minecraftApi } from "./minecraft";
import { resumeApi } from "./resume";
import { financeApi } from "./finance";
import { minorApi } from "./minor";

export const api = {
  login: (username: string, password: string) =>
    request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout"),

  stopImpersonate: () =>
    request<{ ok: boolean; user: AuthUser }>("/auth/stop-impersonate", {
      method: "POST",
    }),

  me: () =>
    request<{ user: AuthUser }>("/auth/me"),

  ingredients: ingredientsApi,
  recipes: recipesApi,
  workouts: workoutsApi,
  measurements: measurementsApi,
  wines: winesApi,
  cashflow: cashflowApi,
  pulse: pulseApi,
  minecraft: minecraftApi,
  resume: resumeApi,
  minor: minorApi,
  finance: financeApi,
};

export { ApiError } from "./core";
export * from "./types";
