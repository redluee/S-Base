import type { FinanceBreakdownGroup } from "@backend/types/finance";

export function formatIban(iban: string | null): string {
  if (!iban) return "";
  const compact = iban.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compact) ? compact.replace(/(.{4})(?=.)/g, "$1 ") : compact;
}

export function sharePercent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const ratio = (part / total) * 100;
  if (ratio > 0 && ratio < 1) return "<1%";
  return `${Math.round(ratio)}%`;
}

export function shareRatio(part: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, part / total)) : 0;
}

export function filterBreakdownGroups(groups: FinanceBreakdownGroup[], query: string): FinanceBreakdownGroup[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return groups;
  return groups.filter((group) => {
    const haystack = `${group.name} ${group.iban ?? ""} ${formatIban(group.iban)}`.toLowerCase();
    return terms.every((term) => haystack.includes(term) || haystack.replace(/\s/g, "").includes(term));
  });
}
