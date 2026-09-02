import type {
  Recipe,
  FullRecipe,
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
  PersonalRecord,
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorStoryWithSprint,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
  MinorVacation,
  MinorStoryType,
  MinorDefaultQualityCriterion,
  MinorPeerHelp,
  MinorDashboardStats,
} from "@backend/types/shared";
import { compressImage } from "./image";

export interface McServer {
  serverId: number;
  slug: string;
  displayName: string;
  engine: "vanilla" | "fabric";
  mcVersion: string;
  serverDir: string;
  javaArgs: string | null;
  templateId: number | null;
  createdAt: string;
  hasMap?: boolean;
  online?: boolean;
}

export interface McServerStatus {
  online: boolean;
  playerCount: number;
}

export interface McTemplate {
  templateId: number;
  name: string;
  engine: string;
  mcVersion: string;
  javaArgs: string | null;
  propertiesJson: string | null;
  notes: string | null;
  createdAt: string;
}

export interface McPlayerStat {
  statId: number;
  serverId: number;
  playerUuid: string;
  playerName: string;
  firstSeen: string;
  lastSeen: string | null;
  totalPlaytime: number;
}

export interface McBannedPlayer {
  uuid: string;
  name: string;
  created?: string;
  source?: string;
  expires?: string;
  reason?: string;
}

export interface McServerInspection {
  isValid: boolean;
  serverDir: string;
  folderName: string;
  hasProperties: boolean;
  hasWorld: boolean;
  hasEula: boolean;
  eulaAccepted: boolean;
  hasJar: boolean;
  jarFiles: string[];
  detectedEngine: "vanilla" | "fabric";
  detectedVersion?: string;
  detectedDisplayName?: string;
  properties: Record<string, string>;
  error?: string;
}

export interface McUnregisteredServerScan {
  serverDir: string;
  folderName: string;
  suggestedSlug: string;
  inspection: McServerInspection;
}

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
  waist?: number | null;
  chest?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  shoulders?: number | null;
  neck?: number | null;
  calves?: number | null;
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

async function uploadFormDataWithProgress<T>(
  url: string,
  file: File | Blob,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<T> {
  const compressedFile = await compressImage(file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        reject(new Error(xhr.statusText || `Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    const formData = new FormData();
    const name = fileName || (compressedFile as File).name || (file as File).name || "upload.jpg";
    formData.append("file", compressedFile, name);
    xhr.send(formData);
  });
}

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  modules?: string[];
  isImpersonated?: boolean;
  impersonatorUserId?: number | null;
  impersonatedBy?: string | null;
}

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
          perSide?: number | null;
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
    uploadPhoto: async (file: File | Blob, fileName?: string, onProgress?: (progress: number) => void) => {
      return uploadFormDataWithProgress<{ filePath: string }>(
        "/api/measurements/upload",
        file,
        fileName,
        onProgress
      );
    },
    deletePhoto: (photoId: number) =>
      request<{ success: boolean }>(`/measurements/photos/${photoId}`, {
        method: "DELETE",
      }),
  },

  wines: {
    list: (type?: string, q?: string, sortBy?: string, sortOrder?: string) => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (q) params.set("q", q);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const qs = params.toString();
      return request<Wine[]>(`/wines${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<Wine>(`/wines/${id}`),
    create: (data: unknown) =>
      request<Wine>("/wines", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) =>
      request<Wine>(`/wines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/wines/${id}`, { method: "DELETE" }),
    uploadPhoto: async (file: File | Blob, fileName?: string, onProgress?: (progress: number) => void) => {
      return uploadFormDataWithProgress<{ filePath: string }>(
        "/api/wines/upload",
        file,
        fileName,
        onProgress
      );
    },
  },

  cashflow: {
    tradeNames: {
      list: () => request<CashflowTradeName[]>("/cashflow/trade-names"),
      create: (data: unknown) => request<CashflowTradeName>("/cashflow/trade-names", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => request<CashflowTradeName>(`/cashflow/trade-names/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ deleted: boolean }>(`/cashflow/trade-names/${id}`, { method: "DELETE" }),
    },
    clients: {
      list: () => request<CashflowClient[]>("/cashflow/clients"),
      get: (id: number) => request<CashflowClient>(`/cashflow/clients/${id}`),
      create: (data: unknown) => request<CashflowClient>("/cashflow/clients", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => request<CashflowClient>(`/cashflow/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ deleted: boolean }>(`/cashflow/clients/${id}`, { method: "DELETE" }),
    },
    projects: {
      list: (clientId?: number) => {
        const params = new URLSearchParams();
        if (clientId) params.set("clientId", String(clientId));
        const qs = params.toString();
        return request<CashflowProject[]>(`/cashflow/projects${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => request<CashflowProjectDetail>(`/cashflow/projects/${id}`),
      create: (data: unknown) => request<CashflowProject>("/cashflow/projects", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => request<CashflowProject>(`/cashflow/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number, deleteInvoices?: boolean) => request<{ deleted: boolean }>(`/cashflow/projects/${id}${deleteInvoices ? "?deleteInvoices=true" : ""}`, { method: "DELETE" }),
    },
    invoices: {
      list: (status?: string, projectId?: number, clientId?: number) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (projectId) params.set("projectId", String(projectId));
        if (clientId) params.set("clientId", String(clientId));
        const qs = params.toString();
        return request<CashflowInvoiceSummary[]>(`/cashflow/invoices${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => request<CashflowInvoiceFull>(`/cashflow/invoices/${id}`),
      nextNumber: () => request<{ invoiceNumber: string }>("/cashflow/invoices/next-number"),
      create: (data: unknown) => request<CashflowInvoiceFull>("/cashflow/invoices", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => request<CashflowInvoiceFull>(`/cashflow/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ deleted: boolean }>(`/cashflow/invoices/${id}`, { method: "DELETE" }),
      markAsPaid: (id: number, datePaid?: number) => request<CashflowInvoiceFull>(`/cashflow/invoices/${id}/paid`, { method: "PATCH", body: datePaid !== undefined ? JSON.stringify({ datePaid }) : undefined }),
    },
    dashboard: (year?: number) => request<CashflowDashboardStats>(year ? `/cashflow/dashboard?year=${year}` : "/cashflow/dashboard"),
  },

  pulse: {
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
  },

  minecraft: {
    versions: () => request<string[]>("/minecraft/versions"),
    servers: {
      list: () => request<McServer[]>("/minecraft/servers"),
      get: (slug: string) => request<McServer>(`/minecraft/servers/${slug}`),
      create: (data: { slug: string; displayName: string; engine: string; mcVersion: string; javaArgs?: string; templateId?: number }) =>
        request<McServer>("/minecraft/servers", { method: "POST", body: JSON.stringify(data) }),
      update: (slug: string, data: { displayName?: string; javaArgs?: string | null }) =>
        request<McServer>(`/minecraft/servers/${slug}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (slug: string, deleteDisk?: boolean) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}${deleteDisk ? "?deleteDisk=true" : ""}`, { method: "DELETE" }),
      start: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/start`, { method: "POST" }),
      stop: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/stop`, { method: "POST" }),
      restart: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/restart`, { method: "POST" }),
      status: (slug: string) => request<McServerStatus>(`/minecraft/servers/${slug}/status`),
      console: {
        get: (slug: string, lines?: number) => request<{ lines: string[] }>(`/minecraft/servers/${slug}/console${lines ? `?lines=${lines}` : ""}`),
        send: (slug: string, command: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/console`, { method: "POST", body: JSON.stringify({ command }) }),
      },
      properties: {
        get: (slug: string) => request<Record<string, string>>(`/minecraft/servers/${slug}/properties`),
        update: (slug: string, props: Record<string, string>) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/properties`, { method: "PATCH", body: JSON.stringify(props) }),
      },
      map: {
        status: (slug: string) => request<{ hasMap: boolean; webExists: boolean }>(`/minecraft/servers/${slug}/map/status`),
      },
      files: {
        list: (slug: string, type: string) => request<{ name: string; size: number; modified: string }[]>(`/minecraft/servers/${slug}/files/${type}`),
        upload: async (
          slug: string,
          type: string,
          files: File | File[] | FileList,
          onProgress?: (current: number, total: number) => void
        ) => {
          const fileList = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
          if (fileList.length === 0) return { ok: true, count: 0 };

          const concurrency = 3;
          let completed = 0;
          let index = 0;
          const errors: { file: string; error: string }[] = [];

          const uploadSingle = async (file: File) => {
            const formData = new FormData();
            formData.append("files", file);
            try {
              const res = await fetch(`/api/minecraft/servers/${slug}/files/${type}`, {
                method: "POST",
                credentials: "include",
                body: formData,
              });
              if (!res.ok) {
                const errText = await res.text().catch(() => "Upload failed");
                throw new Error(errText);
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Upload failed";
              errors.push({ file: file.name, error: msg });
            } finally {
              completed++;
              onProgress?.(completed, fileList.length);
            }
          };

          const pool: Promise<void>[] = [];
          while (index < fileList.length) {
            while (pool.length < concurrency && index < fileList.length) {
              const file = fileList[index++];
              const p: Promise<void> = uploadSingle(file).then(() => {
                const idx = pool.indexOf(p);
                if (idx !== -1) pool.splice(idx, 1);
              });
              pool.push(p);
            }
            if (pool.length > 0) {
              await Promise.race(pool);
            }
          }
          await Promise.all(pool);

          if (errors.length > 0) {
            if (errors.length === fileList.length) {
              throw new Error(errors.map((e) => `${e.file}: ${e.error}`).join("\n"));
            }
            console.warn("Some files failed to upload:", errors);
          }

          return { ok: true, count: completed - errors.length, errors };
        },
        delete: (slug: string, type: string, filename: string) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/files/${type}/${encodeURIComponent(filename)}`, { method: "DELETE" }),
        copy: (slug: string, type: string, sourceSlug: string, filename: string) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/files/${type}/copy`, { method: "POST", body: JSON.stringify({ sourceSlug, filename }) }),
      },
      players: {
        list: (slug: string) => request<{ online: McPlayerStat[]; history: McPlayerStat[]; banned?: McBannedPlayer[] }>(`/minecraft/servers/${slug}/players`),
        op: (slug: string, uuid: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/op`, { method: "POST" }),
        deop: (slug: string, uuid: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/deop`, { method: "POST" }),
        kick: (slug: string, uuid: string, reason?: string) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/kick`, { method: "POST", body: JSON.stringify({ reason }) }),
        ban: (slug: string, uuid: string, reason?: string) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/ban`, { method: "POST", body: JSON.stringify({ reason }) }),
        unban: (slug: string, uuid: string) =>
          request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/unban`, { method: "POST" }),
      },
      error: (slug: string) => request<{ lines: string[]; crashReport?: string }>(`/minecraft/servers/${slug}/error`),
    },
    templates: {
      list: () => request<McTemplate[]>("/minecraft/templates"),
      get: (id: number) => request<McTemplate>(`/minecraft/templates/${id}`),
      create: (slug: string, name: string, notes?: string) =>
        request<McTemplate>("/minecraft/templates", { method: "POST", body: JSON.stringify({ slug, name, notes }) }),
      createCustom: (data: {
        name: string;
        engine: string;
        mcVersion: string;
        properties?: Record<string, string>;
        notes?: string;
        javaArgs?: string;
      }) => request<McTemplate>("/minecraft/templates", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ ok: boolean }>(`/minecraft/templates/${id}`, { method: "DELETE" }),
      files: {
        list: (id: number, type: "mods" | "datapacks" | "resourcepacks") =>
          request<{ name: string; size: number; modified: string }[]>(`/minecraft/templates/${id}/files/${type}`),
        upload: async (id: number, type: "mods" | "datapacks" | "resourcepacks", file: File) => {
          const form = new FormData();
          form.append("files", file);
          const res = await fetch(`/api/minecraft/templates/${id}/files/${type}`, {
            method: "POST",
            credentials: "include",
            body: form,
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "Upload failed");
            throw new Error(errText);
          }
          return res.json().catch(() => ({ ok: true }));
        },
        delete: (id: number, type: "mods" | "datapacks" | "resourcepacks", filename: string) =>
          request<{ ok: boolean }>(`/minecraft/templates/${id}/files/${type}/${encodeURIComponent(filename)}`, {
            method: "DELETE",
          }),
      },
      speedrun: (id: number, slug: string, displayName: string) =>
        request<McServer>(`/minecraft/templates/${id}/speedrun`, { method: "POST", body: JSON.stringify({ slug, displayName }) }),
    },
    import: {
      scan: () => request<McUnregisteredServerScan[]>("/minecraft/import/scan"),
      inspect: (serverDir: string) =>
        request<McServerInspection>("/minecraft/import/inspect", {
          method: "POST",
          body: JSON.stringify({ serverDir }),
        }),
      submit: (data: {
        slug: string;
        displayName: string;
        engine: string;
        mcVersion: string;
        serverDir: string;
        javaArgs?: string;
      }) =>
        request<McServer>("/minecraft/import", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
  },
  minor: {
    dashboard: () => request<MinorDashboardStats>("/minor/dashboard"),
    sprints: {
      list: () => request<MinorSprint[]>("/minor/sprints"),
      get: (id: number) => request<MinorSprintFull>(`/minor/sprints/${id}`),
      nextNumber: () => request<{ nextNumber: string; nextName: string }>("/minor/sprints/next-number"),
      calculateDates: (startDate: string, durationDays: number = 14) =>
        request<{
          startDate: string;
          endDate: string;
          durationDays: number;
          extendedDays: number;
          extensionReason: string | null;
          showAndGrowDate: string;
        }>(`/minor/sprints/calculate-dates?startDate=${encodeURIComponent(startDate)}&durationDays=${durationDays}`),
      create: (data: {
        sprintNumber?: string;
        name?: string;
        startDate: string;
        endDate?: string;
        durationDays?: number;
        showAndGrowDate?: string;
        status?: "planned" | "active" | "completed" | "archived";
      }) => request<MinorSprint>("/minor/sprints", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: Partial<{
        sprintNumber: string;
        name: string;
        startDate: string;
        endDate: string;
        durationDays: number;
        showAndGrowDate: string;
        extendedDays: number;
        extensionReason: string | null;
        status: "planned" | "active" | "completed" | "archived";
      }>) => request<MinorSprint>(`/minor/sprints/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/sprints/${id}`, { method: "DELETE" }),
      autoSelfEvaluations: (id: number) => request<MinorSelfEvaluation[]>(`/minor/sprints/${id}/self-evaluations/auto`, { method: "POST" }),
      saveSelfEvaluations: (id: number, evaluations: { learningOutcome: number; level: "V" | "NV" | "-"; argumentation?: string }[]) =>
        request<MinorSelfEvaluation[]>(`/minor/sprints/${id}/self-evaluations`, { method: "PUT", body: JSON.stringify({ evaluations }) }),
      saveTeacherAssessments: (id: number, assessments: { learningOutcome: number; assessment: "V" | "O" | "-"; notes?: string; evaluatedAt?: string }[]) =>
        request<MinorTeacherAssessment[]>(`/minor/sprints/${id}/teacher-assessments`, { method: "PUT", body: JSON.stringify({ assessments }) }),
      getReflection: (id: number) => request<MinorReflection>(`/minor/sprints/${id}/reflection`),
      saveReflection: (id: number, data: { date?: string; whatLearned?: string; whatRetained?: string; whatChange?: string }) =>
        request<MinorReflection>(`/minor/sprints/${id}/reflection`, { method: "PUT", body: JSON.stringify(data) }),
      feedback: {
        list: (sprintId: number) => request<MinorFeedbackEntry[]>(`/minor/sprints/${sprintId}/feedback`),
        create: (sprintId: number, data: { date: string; fromWhom: string; feedback: string; action: string; orderIndex?: number }) =>
          request<MinorFeedbackEntry>(`/minor/sprints/${sprintId}/feedback`, { method: "POST", body: JSON.stringify(data) }),
        update: (id: number, data: { date?: string; fromWhom?: string; feedback?: string; action?: string; orderIndex?: number }) =>
          request<MinorFeedbackEntry>(`/minor/feedback/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        delete: (id: number) => request<{ success: boolean }>(`/minor/feedback/${id}`, { method: "DELETE" }),
      },
      stories: {
        listAll: () => request<MinorStoryWithSprint[]>("/minor/stories"),
        create: (sprintId: number | null | undefined, data: {
          storyTypeCode?: string;
          storyNumber?: string;
          title: string;
          asA?: string;
          iWant?: string;
          soThat?: string;
          learningOutcomes?: number[];
          status?: "todo" | "in_progress" | "done";
          orderIndex?: number;
          acceptanceCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
          qualityCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
          evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
        }) =>
          sprintId
            ? request<MinorStory>(`/minor/sprints/${sprintId}/stories`, { method: "POST", body: JSON.stringify(data) })
            : request<MinorStory>("/minor/stories", { method: "POST", body: JSON.stringify({ ...data, sprintId: null }) }),
        update: (id: number, data: {
          sprintId?: number | null;
          storyTypeCode?: string;
          storyNumber?: string;
          title?: string;
          asA?: string | null;
          iWant?: string | null;
          soThat?: string | null;
          learningOutcomes?: number[];
          status?: "todo" | "in_progress" | "done";
          orderIndex?: number;
          acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
          qualityCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
          evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
        }) => request<MinorStory>(`/minor/stories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        delete: (id: number) => request<{ success: boolean }>(`/minor/stories/${id}`, { method: "DELETE" }),
        toggleCriterion: (criterionId: number, isCompleted: boolean) =>
          request<MinorStoryCriterion>(`/minor/criteria/${criterionId}/toggle`, { method: "PATCH", body: JSON.stringify({ isCompleted }) }),
      },
    },
    stories: {
      list: () => request<MinorStoryWithSprint[]>("/minor/stories"),
      create: (data: {
        sprintId?: number | null;
        storyTypeCode?: string;
        storyNumber?: string;
        title: string;
        asA?: string;
        iWant?: string;
        soThat?: string;
        learningOutcomes?: number[];
        status?: "todo" | "in_progress" | "done";
        orderIndex?: number;
        acceptanceCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
        qualityCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
        evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
      }) => request<MinorStory>("/minor/stories", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: {
        sprintId?: number | null;
        storyTypeCode?: string;
        storyNumber?: string;
        title?: string;
        asA?: string | null;
        iWant?: string | null;
        soThat?: string | null;
        learningOutcomes?: number[];
        status?: "todo" | "in_progress" | "done";
        orderIndex?: number;
        acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
        qualityCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
        evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
      }) => request<MinorStory>(`/minor/stories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/stories/${id}`, { method: "DELETE" }),
      toggleCriterion: (criterionId: number, isCompleted: boolean) =>
        request<MinorStoryCriterion>(`/minor/criteria/${criterionId}/toggle`, { method: "PATCH", body: JSON.stringify({ isCompleted }) }),
    },
    vacations: {
      list: () => request<MinorVacation[]>("/minor/vacations"),
      create: (data: { name: string; startDate: string; endDate: string }) =>
        request<MinorVacation>("/minor/vacations", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: { name?: string; startDate?: string; endDate?: string }) =>
        request<MinorVacation>(`/minor/vacations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/vacations/${id}`, { method: "DELETE" }),
    },
    storyTypes: {
      list: () => request<MinorStoryType[]>("/minor/story-types"),
      create: (data: { code: string; name: string; description?: string; color?: string; defaultQualityCriteria?: ({ text: string; indent?: number } | string)[] }) =>
        request<MinorStoryType>("/minor/story-types", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: { code?: string; name?: string; description?: string; color?: string; defaultQualityCriteria?: ({ text: string; indent?: number } | string)[] }) =>
        request<MinorStoryType>(`/minor/story-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/story-types/${id}`, { method: "DELETE" }),
    },
    peerHelp: {
      list: () => request<MinorPeerHelp[]>("/minor/peer-help"),
      create: (data: { sprintId?: number | null; date: string; peerName: string; description: string; links?: string }) =>
        request<MinorPeerHelp>("/minor/peer-help", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: { sprintId?: number | null; date?: string; peerName?: string; description?: string; links?: string }) =>
        request<MinorPeerHelp>(`/minor/peer-help/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/peer-help/${id}`, { method: "DELETE" }),
    },
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/minor/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      return res.json() as Promise<{ filePath: string; originalName: string }>;
    },
  },
};

export type {
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorStoryWithSprint,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
  MinorVacation,
  MinorStoryType,
  MinorDefaultQualityCriterion,
  MinorPeerHelp,
  MinorDashboardStats,
};

export interface PulseUser {
  userId: number;
  username: string;
  email: string | null;
  isPaused: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  modules: string[];
  mcServers?: string[];
}

export interface PulseModuleInfo {
  moduleId: number;
  moduleName: string;
  moduleAlias: string | null;
  description: string | null;
}

export interface PulseStats {
  totalUsers: number;
  activeUsers: number;
  pausedUsers: number;
  totalPermissions: number;
}

export interface Wine {
  wineId: number;
  userId: number;
  brand: string;
  type: "red" | "white" | "rose" | "sparkling" | "dessert";
  variety: string;
  vintage: number | null;
  countryRegion: string | null;
  purchaseLocation: string | null;
  rating: number | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface CashflowTradeName {
  id: number;
  userId: number;
  displayName: string;
  address: string | null;
  iban: string | null;
  kvkNumber: string | null;
  vatNumber: string | null;
  createdAt: string;
}

export interface CashflowClient {
  id: number;
  userId: number;
  name: string;
  address: string | null;
  email: string | null;
  kvkNumber: string | null;
  standardRate: number | null;
  createdAt: string;
}

export interface CashflowProject {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientEmail: string | null;
  tradeNameId: number | null;
  tradeNameDisplay: string | null;
  invoiceCount: number;
  totalBilled: number;
}

export interface CashflowProjectDetail {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  clientKvk: string | null;
  standardRate: number | null;
  tradeNameId: number | null;
  tradeNameDisplay: string | null;
  tradeNameAddress: string | null;
  tradeNameIban: string | null;
  tradeNameKvk: string | null;
}

export interface CashflowInvoiceLine {
  id: number;
  invoiceId: number;
  date?: number | null;
  taskDescription: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  type: "hours" | "service" | "travel_costs" | "discount";
  discountType: "percentage" | "amount" | null;
  discountValue: number | null;
}

export interface CashflowInvoiceSummary {
  id: number;
  invoiceNumber: string;
  name?: string | null;
  status: "draft" | "sent" | "paid" | "overdue";
  dateCreated: number | null;
  dateService: number | null;
  paymentDueDate: number | null;
  datePaid?: number | null;
  isKor: boolean;
  projectId: number | null;
  projectName: string | null;
  clientId: number;
  clientName: string;
  tradeNameDisplay: string | null;
  total: number;
}

export interface CashflowInvoiceFull extends CashflowInvoiceSummary {
  projectLocation: string | null;
  clientAddress: string | null;
  clientEmail: string | null;
  clientKvk: string | null;
  tradeNameId: number | null;
  tradeNameAddress: string | null;
  tradeNameIban: string | null;
  tradeNameKvk: string | null;
  tradeNameVat: string | null;
  lines: CashflowInvoiceLine[];
  total: number;
  createdAt: string;
}

export interface CashflowDashboardStats {
  monthlyIncome: { month: string; total: number }[];
  statusTotals: { status: string; count: number; total: number }[];
  totalPaid12m: number;
}

