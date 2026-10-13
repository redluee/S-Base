import { request } from "./core";
import type {
  AuthUser,
  PulseModuleInfo,
  PulseStats,
  PulseUser,
  ShutdownSchedule,
  SystemUpdateState,
} from "./types";

export const pulseApi = {
  users: () => request<PulseUser[]>("/pulse/users"),
  modules: () => request<PulseModuleInfo[]>("/pulse/modules"),
  stats: () => request<PulseStats>("/pulse/stats"),
  updateEmail: (id: number, email: string | null) =>
    request<PulseUser>(`/pulse/users/${id}/email`, {
      method: "PUT",
      body: JSON.stringify({ email }),
    }),
  updateStatus: (id: number, isPaused: boolean) =>
    request<PulseUser>(`/pulse/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ isPaused }),
    }),
  updateModules: (id: number, modules: string[]) =>
    request<PulseUser>(`/pulse/users/${id}/modules`, {
      method: "PUT",
      body: JSON.stringify({ modules }),
    }),
  updateServers: (id: number, servers: string[]) =>
    request<PulseUser>(`/pulse/users/${id}/servers`, {
      method: "PUT",
      body: JSON.stringify({ servers }),
    }),
  impersonate: (id: number) =>
    request<{ ok: boolean; user: AuthUser }>(`/pulse/users/${id}/impersonate`, {
      method: "POST",
    }),
  getShutdownSchedule: () => request<ShutdownSchedule>("/pulse/shutdown-schedule"),
  updateShutdownSchedule: (data: { time?: string; enabled?: boolean }) =>
    request<ShutdownSchedule>("/pulse/shutdown-schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  blockShutdown: () =>
    request<ShutdownSchedule>("/pulse/shutdown-schedule/block", {
      method: "POST",
    }),
  unblockShutdown: () =>
    request<ShutdownSchedule>("/pulse/shutdown-schedule/unblock", {
      method: "POST",
    }),
  shutdownNow: () =>
    request<{ ok: boolean }>("/pulse/shutdown-now", {
      method: "POST",
    }),
  getSystemUpdate: () => request<SystemUpdateState>("/pulse/system-update"),
  startSystemUpdate: () =>
    request<SystemUpdateState>("/pulse/system-update", {
      method: "POST",
    }),
  reboot: () =>
    request<{ ok: boolean }>("/pulse/reboot", {
      method: "POST",
    }),
};
