import type { FinanceAccountIcon } from "@backend/types/finance-icons";
import { request } from "./core";
import type {
  FinanceAccount,
  FinanceDashboard,
  FinanceData,
  FinancePeriod,
  FinanceImportOrder,
  FinanceImportPreview,
  FinanceImportSelection,
  FinanceImportResult,
  FinanceTransactionPage,
  FinanceSubscriptions,
  FinanceSubscriptionCadence,
} from "@backend/types/finance";

const json = (method: string, body: unknown) => ({
  method,
  body: JSON.stringify(body),
});
export const financeApi = {
  addSubscription: (transactionId: number, cadence: FinanceSubscriptionCadence) =>
    request<{ success: boolean }>("/finance/subscriptions", json("POST", { transactionId, cadence })),
  subscriptionCandidates: (search: string, page: number) =>
    request<FinanceTransactionPage>(`/finance/transactions?subscriptionCandidate=true&search=${encodeURIComponent(search)}&page=${page}`),
  subscriptions: () => request<FinanceSubscriptions>("/finance/subscriptions"),
  subscriptionTransactions: (id: string, page: number) =>
    request<FinanceTransactionPage>(`/finance/subscriptions/${encodeURIComponent(id)}/transactions?page=${page}`),
  renameSubscription: (id: string, name: string) =>
    request<{ success: boolean }>("/finance/subscriptions/name", json("PUT", { id, name })),
  mergeSubscriptions: (id: string, targetId: string) =>
    request<{ success: boolean }>("/finance/subscriptions/merge", json("POST", { id, targetId })),
  excludeSubscription: (id: string) =>
    request<{ success: boolean }>("/finance/subscriptions", json("DELETE", { id })),
  setSubscriptionInactive: (id: string, inactive: boolean) =>
    request<{ success: boolean }>("/finance/subscriptions/inactive", json("PUT", { id, inactive })),
  budgetTransactions: (date: string, page: number) =>
    request<FinanceTransactionPage>(`/finance/budget/transactions?date=${date}&page=${page}`),
  setMonthlyBudget: (monthlyBudgetCents: number | null) =>
    request<{ monthlyBudgetCents: number | null }>("/finance/settings/budget", json("PUT", { monthlyBudgetCents })),
  previewImport: (content: string, order: FinanceImportOrder, anchors?: Record<string, number>) =>
    request<FinanceImportPreview>(
      "/finance/import/preview",
      json("POST", { content, order, anchors }),
    ),
  importBalances: (
    content: string,
    order: FinanceImportOrder,
    selections: FinanceImportSelection[],
    anchors?: Record<string, number>,
  ) =>
    request<FinanceImportResult>(
      "/finance/import",
      json("POST", { content, order, selections, anchors }),
    ),
  transactions: (start: string, end: string, page: number) =>
    request<FinanceTransactionPage>(`/finance/transactions?start=${start}&end=${end}&page=${page}`),
  reset: () => request<{ success: boolean; }>("/finance/settings/reset", json("POST", { confirmation: "DELETE_FINANCE" })),
  setAccountIcon: (id: number, icon: FinanceAccountIcon | null) =>
    request<FinanceAccount>(`/finance/accounts/${id}/icon`, json("PUT", { icon })),
  data: () => request<FinanceData>("/finance/"),
  dashboard: (period: FinancePeriod, date: string) =>
    request<FinanceDashboard>(
      `/finance/dashboard?period=${period}&date=${date}`,
    ),
};
