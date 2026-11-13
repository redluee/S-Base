import { t } from "@/lib/lang";
import type { CashflowInvoiceSummary } from "@/lib/api";
import type { InvoiceStatus } from "@backend/shared/cashflow";
import {
  FileText,
  Check,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { parseDateString } from "@backend/shared/dates";

export type SortField = "number" | "client" | "date" | "dueDate" | "total";
export type SortOrder = "asc" | "desc";



export function getInvoiceCreationTimestamp(inv: CashflowInvoiceSummary): number {
  if (inv.createdAt) {
    const t = parseDateString(inv.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  return inv.id;
}

export function getInvoiceYear(inv: CashflowInvoiceSummary): number {
  return new Date(inv.bookedAt).getFullYear();
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

export const statusConfig: Record<InvoiceStatus | "open", { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: t("Concept"), color: "bg-zinc-800 text-zinc-300 border-zinc-700", icon: FileText },
  sent: { label: t("Verzonden"), color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  paid: { label: t("Betaald"), color: "bg-brand/10 text-brand border-brand/20", icon: Check },
  overdue: { label: t("Te laat"), color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertCircle },
  open: { label: t("Openstaand"), color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
};
