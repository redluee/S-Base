export type FinanceAccountType = "current" | "savings";
export type FinancePeriod = "month" | "year" | "all";
export interface FinanceObservation {
  id: number;
  accountId: number;
  date: string;
  balanceCents: number;
}
export interface FinanceAccount {
  id: number;
  name: string;
  bank: string | null;
  type: FinanceAccountType;
  openingDate: string;
  archived: boolean;
}
export interface FinanceAccountInput {
  name: string;
  bank?: string | null;
  type: FinanceAccountType;
  openingDate: string;
  openingBalanceCents: number;
}
export interface FinanceBalanceEntry {
  accountId: number;
  balanceCents: number;
  expectedCents: number | null;
}
export interface FinanceGoal {
  id: number;
  name: string;
  targetCents: number;
  targetDate: string | null;
}
export interface FinanceAllocation {
  goalId: number;
  accountId: number;
  amountCents: number;
}
export interface FinanceData {
  accounts: FinanceAccount[];
  observations: FinanceObservation[];
  goals: FinanceGoal[];
  allocations: FinanceAllocation[];
  today: string;
}
export interface FinanceSnapshot {
  date: string;
  totalCents: number | null;
  savingsCents: number | null;
  complete: boolean;
  mixedDates: boolean;
  known: number;
  expected: number;
  accounts: (FinanceAccount & {
    balanceCents: number | null;
    lastDate: string | null;
  })[];
}
export interface FinanceComparison {
  changeCents: number | null;
  percent: number | null;
  reason: "insufficient" | "coverage" | "cohort" | "zero" | null;
}
export interface FinanceDashboard {
  startDate: string;
  endDate: string;
  start: FinanceSnapshot;
  end: FinanceSnapshot;
  comparison: FinanceComparison;
  savingsComparison: FinanceComparison;
  history: FinanceSnapshot[];
}

export type FinanceImportOrder = "descending" | "ascending";
export interface FinanceImportSource {
  sourceKey: string;
  label: string;
  rowCount: number;
  balances: { date: string; balanceCents: number }[];
}
export interface FinanceImportPreview {
  sources: FinanceImportSource[];
  rowCount: number;
}
export interface FinanceImportSelection {
  sourceKey: string;
  accountId?: number;
  newAccount?: { name: string; type: FinanceAccountType };
  extendOpening: boolean;
  entries: { date: string; expectedCents: number | null }[];
}
export interface FinanceImportResult {
  createdAccounts: number;
  inserted: number;
  updated: number;
  unchanged: number;
}
