import type { FinanceAccountType, FinanceImportFormat, FinanceImportPreview } from "../../types/finance";

export interface ImportTransaction {
  date: string;
  balanceCents: number | null;
  delta: number;
  name: string;
  description: string;
  counterparty: string;
}

export interface ImportSource {
  account: string;
  accountName: string;
  bank: string | null;
  sourceKey: string;
  label: string;
  suggestedType?: FinanceAccountType;
  needsBalance: boolean;
  firstDate: string;
  lastDate: string;
  rowCount: number;
  reconstructedRowCount?: number;
  balances: { date: string; balanceCents: number }[];
  transactions: ImportTransaction[];
}

export interface ParsedImport {
  format: FinanceImportFormat;
  sources: ImportSource[];
  rowCount: number;
}

export function importPreview(parsed: ParsedImport): FinanceImportPreview {
  return {
    format: parsed.format,
    rowCount: parsed.rowCount,
    sources: parsed.sources.map(({ accountName, transactions, account, ...source }) => {
      void transactions;
      void account;
      return { ...source, suggestedName: accountName || undefined };
    }),
  };
}
