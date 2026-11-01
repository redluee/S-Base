"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/lang";
import type { CashflowInvoiceSummary } from "@/lib/api";
import { Check, Pencil, Trash2, Eye } from "lucide-react";
import { CashflowPDFButton } from "@/components/cashflow-pdf";
import { formatEuro, formatDate, statusConfig, SortHeaderIcon, type SortField, type SortOrder } from "./invoice-utils";

export function InvoiceList({
  sorted,
  sortBy,
  sortOrder,
  now,
  markingPaid,
  deleting,
  handleHeaderSort,
  handleMarkPaid,
  handleDelete,
}: {
  sorted: CashflowInvoiceSummary[];
  sortBy: SortField;
  sortOrder: SortOrder;
  now: number;
  markingPaid: number | null;
  deleting: number | null;
  handleHeaderSort: (field: SortField) => void;
  handleMarkPaid: (id: number) => void;
  handleDelete: (id: number) => void;
}) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {/* Desktop table header */}
      <div className="hidden sm:grid sm:grid-cols-[160px_1.5fr_1fr_1fr_110px_165px] gap-4 px-4 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
        <button
          type="button"
          onClick={() => handleHeaderSort("number")}
          className={`flex items-center gap-1 hover:text-zinc-300 transition-colors text-left cursor-pointer group ${sortBy === "number" ? "text-blue-400 font-bold" : ""}`}
        >
          <span>{t("Nummer")}</span>
          <SortHeaderIcon field="number" sortBy={sortBy} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => handleHeaderSort("client")}
          className={`flex items-center gap-1 hover:text-zinc-300 transition-colors text-left cursor-pointer group ${sortBy === "client" ? "text-blue-400 font-bold" : ""}`}
        >
          <span>{t("Klant / Project")}</span>
          <SortHeaderIcon field="client" sortBy={sortBy} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => handleHeaderSort("date")}
          className={`flex items-center gap-1 hover:text-zinc-300 transition-colors text-left cursor-pointer group ${sortBy === "date" ? "text-blue-400 font-bold" : ""}`}
        >
          <span>{t("Datum")}</span>
          <SortHeaderIcon field="date" sortBy={sortBy} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => handleHeaderSort("dueDate")}
          className={`flex items-center gap-1 hover:text-zinc-300 transition-colors text-left cursor-pointer group ${sortBy === "dueDate" ? "text-blue-400 font-bold" : ""}`}
        >
          <span>{t("Vervaldatum")}</span>
          <SortHeaderIcon field="dueDate" sortBy={sortBy} sortOrder={sortOrder} />
        </button>
        <button
          type="button"
          onClick={() => handleHeaderSort("total")}
          className={`flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors text-right cursor-pointer group ${sortBy === "total" ? "text-blue-400 font-bold" : ""}`}
        >
          <span>{t("Totaal")}</span>
          <SortHeaderIcon field="total" sortBy={sortBy} sortOrder={sortOrder} />
        </button>
        <div className="text-right">{t("Acties")}</div>
      </div>

      {sorted.map(inv => {
        const cfg = statusConfig[inv.status] ?? statusConfig.draft;
        const StatusIcon = cfg.icon;
        const isOverdue = inv.status !== "paid" && inv.status !== "draft" && Boolean(inv.paymentDueDate && inv.paymentDueDate < now);

        return (
          <div key={inv.id}>
            {/* Desktop view row */}
            <div
              onClick={() => router.push(`/cashflow/invoices/${inv.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`${t("Details bekijken")}: ${inv.invoiceNumber} — ${inv.clientName}`}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/cashflow/invoices/${inv.id}`);
                }
              }}
              className={`hidden sm:grid sm:grid-cols-[160px_1.5fr_1fr_1fr_110px_165px] gap-4 items-center px-4 py-3 bg-zinc-900 border rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isOverdue ? "border-rose-500/30 hover:border-rose-500/50" : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Status & Number */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] leading-none font-medium tracking-wide shrink-0 ${cfg.color}`}>
                  <StatusIcon className="size-2.5" />
                  {cfg.label}
                </span>
                <Link
                  href={`/cashflow/invoices/${inv.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs font-mono font-bold text-white hover:text-blue-400 transition-colors shrink-0"
                >
                  {inv.invoiceNumber}
                </Link>
              </div>

              {/* Client / Project */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate" title={inv.clientName}>{inv.clientName}</p>
                {inv.projectName ? (
                  <p className="text-xs text-zinc-400 truncate" title={inv.projectName}>{inv.projectName}</p>
                ) : inv.name ? (
                  <p className="text-xs text-zinc-400 truncate font-italic" title={inv.name}>{inv.name}</p>
                ) : (
                  <p className="text-xs text-zinc-400">—</p>
                )}
              </div>

              {/* Date */}
              <div className="min-w-0">
                <p className="text-xs text-zinc-300">{formatDate(inv.dateCreated)}</p>
                {inv.tradeNameDisplay && (
                  <p className="text-xs text-zinc-500 truncate" title={inv.tradeNameDisplay}>{inv.tradeNameDisplay}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <p className={`text-xs ${isOverdue ? "text-rose-400 font-semibold" : "text-zinc-300"}`}>
                  {formatDate(inv.paymentDueDate)}
                </p>
              </div>

              {/* Total */}
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatEuro(inv.total)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                {inv.status !== "paid" && (
                  <button
                    onClick={() => handleMarkPaid(inv.id)}
                    disabled={markingPaid === inv.id}
                    title={t("Markeer als betaald")}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
                <Link
                  href={`/cashflow/invoices/${inv.id}`}
                  title={t("Details bekijken")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  <Eye className="size-3.5" />
                </Link>
                <Link
                  href={`/cashflow/invoices/new?edit=${inv.id}`}
                  title={t("Factuur bewerken")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <Pencil className="size-3.5" />
                </Link>
                  <CashflowPDFButton invoiceId={inv.id} iconOnly />
                  <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer">
                    <Trash2 className="size-3.5" />
                  </button>
              </div>
            </div>

            {/* Mobile view card */}
            <div
              onClick={() => router.push(`/cashflow/invoices/${inv.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`${t("Details bekijken")}: ${inv.invoiceNumber} — ${inv.clientName}`}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/cashflow/invoices/${inv.id}`);
                }
              }}
              className={`sm:hidden p-4 bg-zinc-900 border rounded-xl space-y-3 cursor-pointer hover:border-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isOverdue ? "border-rose-500/30 hover:border-rose-500/50" : "border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] leading-none font-medium ${cfg.color}`}>
                    <StatusIcon className="size-2.5" />
                    {cfg.label}
                  </span>
                  <Link
                    href={`/cashflow/invoices/${inv.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs font-mono font-bold text-white hover:text-blue-400"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </div>
                <span className="text-base font-bold text-white">{formatEuro(inv.total)}</span>
              </div>

              <div className="text-xs space-y-1 pt-2 border-t border-zinc-800/80">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("Klant")}:</span>
                  <span className="text-white font-medium">{inv.clientName}</span>
                </div>
                {inv.projectName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("Project")}:</span>
                    <span className="text-zinc-400">{inv.projectName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("Datum")}:</span>
                  <span className="text-zinc-400">{formatDate(inv.dateCreated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("Vervaldatum")}:</span>
                  <span className={isOverdue ? "text-rose-400 font-semibold" : "text-zinc-400"}>
                    {formatDate(inv.paymentDueDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80" onClick={e => e.stopPropagation()}>
                <div>
                  {inv.status !== "paid" && (
                    <button
                      onClick={() => handleMarkPaid(inv.id)}
                      disabled={markingPaid === inv.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-colors cursor-pointer"
                    >
                      <Check className="size-3.5" /> {t("Markeer als betaald")}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/cashflow/invoices/${inv.id}`}
                    title={t("Details bekijken")}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Eye className="size-3.5" />
                  </Link>
                  <Link href={`/cashflow/invoices/new?edit=${inv.id}`} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                    <Pencil className="size-3.5" />
                  </Link>
                  <CashflowPDFButton invoiceId={inv.id} iconOnly />
                  <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
