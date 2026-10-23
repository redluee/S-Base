import { request } from "./core";
import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceBalanceEntry,
  FinanceDashboard,
  FinanceData,
  FinanceGoal,
  FinancePeriod,
} from "@backend/types/finance";

const json = (method: string, body: unknown) => ({
  method,
  body: JSON.stringify(body),
});
export const financeApi = {
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
    request<{ success: boolean }>(
      "/finance/balances",
      json("POST", { date, entries }),
    ),
  deleteObservation: (id: number, date: string) =>
    request<{ success: boolean }>(
      `/finance/accounts/${id}/observations/${date}`,
      { method: "DELETE" },
    ),
  createGoal: (body: Omit<FinanceGoal, "id">) =>
    request<FinanceGoal>("/finance/goals", json("POST", body)),
  updateGoal: (id: number, body: Omit<FinanceGoal, "id">) =>
    request<FinanceGoal>(`/finance/goals/${id}`, json("PUT", body)),
  deleteGoal: (id: number) =>
    request<{ success: boolean }>(`/finance/goals/${id}`, { method: "DELETE" }),
  allocate: (goalId: number, accountId: number, amountCents: number) =>
    request<{ success: boolean }>(
      `/finance/goals/${goalId}/allocations/${accountId}`,
      json("PUT", { amountCents }),
    ),
};
