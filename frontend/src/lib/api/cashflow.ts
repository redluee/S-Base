import { request } from "./core";
import type {
  CashflowClient,
  CashflowDashboardStats,
  CashflowExpense,
  CashflowInvoiceFull,
  CashflowInvoiceSummary,
  CashflowProject,
  CashflowProjectDetail,
  CashflowTradeName,
} from "./types";

export const cashflowApi = {
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
  upload: async (file: File | Blob, fileName?: string) => {
    const formData = new FormData();
    formData.append("file", file, fileName || (file as File).name || "contract.pdf");
    const res = await fetch("/api/cashflow/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to upload file");
    return res.json() as Promise<{ filePath: string; originalName: string }>;
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
    sendEmail: (id: number, data: { to: string; subject: string; message: string; pdfBase64: string }) =>
      request<{ sent: boolean }>(`/cashflow/invoices/${id}/send-email`, { method: "POST", body: JSON.stringify(data) }),
  },
  expenses: {
    list: (options?: { year?: number; category?: string; tradeNameId?: number }) => {
      const params = new URLSearchParams();
      if (options?.year) params.set("year", String(options.year));
      if (options?.category) params.set("category", options.category);
      if (options?.tradeNameId) params.set("tradeNameId", String(options.tradeNameId));
      const qs = params.toString();
      return request<CashflowExpense[]>(`/cashflow/expenses${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<CashflowExpense>(`/cashflow/expenses/${id}`),
    create: (data: unknown) => request<CashflowExpense>("/cashflow/expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => request<CashflowExpense>(`/cashflow/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ deleted: boolean }>(`/cashflow/expenses/${id}`, { method: "DELETE" }),
  },
  dashboard: (year?: number) => request<CashflowDashboardStats>(year ? `/cashflow/dashboard?year=${year}` : "/cashflow/dashboard"),
};
