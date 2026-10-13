import type { CashflowInvoiceSummary } from "@/lib/api";
import {
  FileText,
  Check,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { parseDateString } from "@/lib/utils";

export type SortField = "number" | "client" | "date" | "dueDate" | "total";
export type SortOrder = "asc" | "desc";

export function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("nl-NL");
}

export function getInvoiceCreationTimestamp(inv: CashflowInvoiceSummary): number {
  if (inv.createdAt) {
    const t = parseDateString(inv.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  return inv.id;
}

export function getInvoiceYear(inv: CashflowInvoiceSummary, now: number): number {
  if (inv.datePaid) return new Date(inv.datePaid).getFullYear();
  if (inv.dateCreated) return new Date(inv.dateCreated).getFullYear();
  if (inv.createdAt) {
    const d = parseDateString(inv.createdAt);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return new Date(now).getFullYear();
}

export function SortHeaderIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy === field) {
    return sortOrder === "asc" ? (
      <ArrowUp className="size-3 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="size-3 text-blue-400 shrink-0" />
    );
  }
  return <ArrowUpDown className="size-3 text-zinc-600 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />;
}

export const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Concept", color: "bg-zinc-800 text-zinc-300 border-zinc-700", icon: FileText },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  paid: { label: "Betaald", color: "bg-brand/10 text-brand border-brand/20", icon: Check },
  overdue: { label: "Te laat", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertCircle },
  open: { label: "Openstaand", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
};
