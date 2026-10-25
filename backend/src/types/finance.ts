import type { FinanceAccountIcon } from "./finance-icons";

export type FinanceAccountType = "current" | "savings";
export type FinancePeriod = "month" | "year" | "all";
export interface FinanceObservation {
  id: number;
  accountId: number;
  date: string;
  balanceCents: number;
}
export interface FinanceAccount {
  icon?: FinanceAccountIcon | null;
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
  monthlyBudgetCents: number | null;
  accounts: FinanceAccount[];
  observations: FinanceObservation[];
  goals: FinanceGoal[];
  allocations: FinanceAllocation[];
  today: string;
}
export interface FinanceSnapshot {
  date: string;
  totalCents: number | null;
  transferAdjustedTotalCents?: number | null;
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
  budget?: { month: string; limitCents: number; spendingCents: number; remainingCents: number } | null;
  startDate: string;
  endDate: string;
  start: FinanceSnapshot;
  end: FinanceSnapshot;
  comparison: FinanceComparison;
  savingsComparison: FinanceComparison;
  history: FinanceSnapshot[];
  activity?: FinanceActivity;
}

export type FinanceImportOrder = "descending" | "ascending";
export interface FinanceImportSource {
  sourceKey: string;
  label: string;
  suggestedType?: FinanceAccountType;
  reconstructedRowCount?: number;
  matchedAccountId?: number;
  suggestedName?: string;
  needsBalance?: boolean;
  firstDate?: string;
  lastDate?: string;
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
  transactionsInserted: number;
  transactionsRemoved: number;
}

export interface FinanceTransaction {
  id: number;
  accountId: number;
  date: string;
  amountCents: number;
  name: string;
  description: string;
  internalTransfer: boolean;
  automaticTransfer: boolean;
}
export interface FinanceActivity {
  incomeCents: number;
  spendingCents: number;
  netCents: number;
  transactionCount: number;
  excludedCount: number;
  coverage: { accountId: number; firstDate: string; lastDate: string }[];
}
export interface FinanceTransactionPage {
  entries: FinanceTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export type FinanceSubscriptionCadence = "weekly" | "fortnightly" | "fourWeekly" | "monthly" | "quarterly" | "yearly";
export interface FinanceSubscription {
  id: string;
  sourceKeys: string[];
  accountIds: number[];
  accountId: number;
  name: string;
  cadence: FinanceSubscriptionCadence;
  paymentCents: number;
  monthlyCents: number;
  totalCents: number;
  paymentCount: number;
  firstDate: string;
  lastDate: string;
  active: boolean;
}
export interface FinanceSubscriptions {
  entries: FinanceSubscription[];
  monthlyCents: number;
  totalCents: number;
  asOf: string;
  lastImportedDate: string | null;
}
