import type { FinanceAccountIcon } from "@backend/types/finance-icons";
import { request } from "./core";
import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceBalanceEntry,
  FinanceDashboard,
  FinanceData,
  FinanceGoal,
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
  setMonthlyBudget: (monthlyBudgetCents: number | null) =>
    request<{ monthlyBudgetCents: number | null }>("/finance/settings/budget", json("PUT", { monthlyBudgetCents })),
  previewImport: (csv: string, order: FinanceImportOrder, anchors?: Record<string, number>) =>
    request<FinanceImportPreview>(
      "/finance/import/preview",
      json("POST", { csv, order, anchors }),
    ),
  importBalances: (
    csv: string,
    order: FinanceImportOrder,
    selections: FinanceImportSelection[],
    anchors?: Record<string, number>,
  ) =>
    request<FinanceImportResult>(
      "/finance/import",
      json("POST", { csv, order, selections, anchors }),
    ),
  transactions: (start: string, end: string, page: number) =>
    request<FinanceTransactionPage>(`/finance/transactions?start=${start}&end=${end}&page=${page}`),
  setTransfer: (id: number, internalTransfer: boolean | null) =>
    request<{ success: boolean; }>(`/finance/transactions/${id}/transfer`, json("PUT", { internalTransfer })),
  reset: () => request<{ success: boolean; }>("/finance/settings/reset", json("POST", { confirmation: "DELETE_FINANCE" })),
  setAccountIcon: (id: number, icon: FinanceAccountIcon | null) =>
    request<FinanceAccount>(`/finance/accounts/${id}/icon`, json("PUT", { icon })),
  data: () => request<FinanceData>("/finance/"),
  dashboard: (period: FinancePeriod, date: string) =>
    request<FinanceDashboard>(
      `/finance/dashboard?period=${period}&date=${date}`,
    ),
  createAccount: (body: FinanceAccountInput) =>
    request<FinanceAccount>("/finance/accounts", json("POST", body)),
  updateAccount: (id: number, body: FinanceAccountInput) =>
    request<FinanceAccount>(`/finance/accounts/${id}`, json("PUT", body)),
  archive: (id: number, archived: boolean) =>
    request<FinanceAccount>(
      `/finance/accounts/${id}/archive`,
      json("PUT", { archived }),
    ),
  balances: (date: string, entries: FinanceBalanceEntry[]) =>
    request<{ success: boolean; }>(
      "/finance/balances",
      json("POST", { date, entries }),
    ),
  deleteObservation: (id: number, date: string) =>
    request<{ success: boolean; }>(
      `/finance/accounts/${id}/observations/${date}`,
      { method: "DELETE" },
    ),
  createGoal: (body: Omit<FinanceGoal, "id">) =>
    request<FinanceGoal>("/finance/goals", json("POST", body)),
  updateGoal: (id: number, body: Omit<FinanceGoal, "id">) =>
    request<FinanceGoal>(`/finance/goals/${id}`, json("PUT", body)),
  deleteGoal: (id: number) =>
    request<{ success: boolean; }>(`/finance/goals/${id}`, { method: "DELETE" }),
  allocate: (goalId: number, accountId: number, amountCents: number) =>
    request<{ success: boolean; }>(
      `/finance/goals/${goalId}/allocations/${accountId}`,
      json("PUT", { amountCents }),
    ),
};
