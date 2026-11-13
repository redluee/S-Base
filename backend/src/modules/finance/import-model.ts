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
    sources: parsed.sources.map((source) => ({
      sourceKey: source.sourceKey,
      label: source.label,
      bank: source.bank,
      suggestedType: source.suggestedType,
      needsBalance: source.needsBalance,
      firstDate: source.firstDate,
      lastDate: source.lastDate,
      rowCount: source.rowCount,
      reconstructedRowCount: source.reconstructedRowCount,
      balances: source.balances,
      suggestedName: source.accountName || undefined,
    })),
  };
}
