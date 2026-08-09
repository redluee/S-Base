import type {
  Recipe,
  FullRecipe,
  WorkoutTemplate,
  FullWorkoutTemplate,
  WorkoutSession,
  FullWorkoutSession,
  PersonalRecord,
} from "@backend/types/shared";
import { compressImage } from "./image";

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

export const api = {
  login: (username: string, password: string) =>
    request<{ user: { id: number; username: string; email: string | null } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout"),

  me: () =>
    request<{ user: { id: number; username: string; email: string | null } }>("/auth/me"),

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
};

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

