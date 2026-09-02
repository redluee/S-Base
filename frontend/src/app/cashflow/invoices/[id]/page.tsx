"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceFull } from "@/lib/api";
import { Check, Pencil, ArrowLeft, Building2, User, CreditCard, Hash, Trash2 } from "lucide-react";
import { CashflowPDFButton } from "@/components/cashflow-pdf";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}
function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Concept", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  paid: { label: "Betaald", color: "bg-brand/10 text-brand border-brand/20" },
  overdue: { label: "Te laat", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<CashflowInvoiceFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [editingPaidDate, setEditingPaidDate] = useState(false);
  const [paidDateInput, setPaidDateInput] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const inv = await api.cashflow.invoices.get(Number(id));
        setInvoice(inv);
        if (inv.datePaid) {
          setPaidDateInput(new Date(inv.datePaid).toISOString().split("T")[0]);
        } else {
          setPaidDateInput(new Date().toISOString().split("T")[0]);
        }
      } catch {
        router.push("/cashflow/invoices");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!invoice || !confirm(t("Weet je zeker dat je deze factuur wilt verwijderen?"))) return;
    setDeleting(true);
    try {
      await api.cashflow.invoices.delete(invoice.id);
      router.push("/cashflow/invoices");
    } catch {
      setDeleting(false);
    }
  }

  async function handleMarkPaid(customDateTs?: number) {
    if (!invoice) return;
    setMarkingPaid(true);
    try {
      const ts = customDateTs ?? (paidDateInput ? new Date(paidDateInput).getTime() : Date.now());
      const updated = await api.cashflow.invoices.markAsPaid(invoice.id, ts);
      setInvoice(updated);
      setEditingPaidDate(false);
    } catch {} finally { setMarkingPaid(false); }
  }

  async function handleUpdatePaidDate(dateStr: string) {
    if (!invoice || !dateStr) return;
    const ts = new Date(dateStr).getTime();
    setMarkingPaid(true);
    try {
      const updated = await api.cashflow.invoices.markAsPaid(invoice.id, ts);
      setInvoice(updated);
      setEditingPaidDate(false);
    } catch {} finally { setMarkingPaid(false); }
  }

  const [now] = useState(() => Date.now());

  if (loading || !invoice) {
    return <div className="flex justify-center py-24"><div className="size-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>;
  }

  const cfg = statusConfig[invoice.status] ?? statusConfig.draft;
  const isOverdue = invoice.status !== "paid" && Boolean(invoice.paymentDueDate && invoice.paymentDueDate < now);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/cashflow/invoices" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-2 transition-colors">
            <ArrowLeft className="size-3" />Terug naar facturen
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white font-mono">{invoice.invoiceNumber}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${isOverdue ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : cfg.color}`}>
              {isOverdue ? "Te laat" : cfg.label}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{invoice.clientName}{invoice.projectName ? ` · ${invoice.projectName}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {invoice.status !== "paid" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={paidDateInput}
                onChange={e => setPaidDateInput(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-brand"
              />
              <button
                onClick={() => handleMarkPaid()}
                disabled={markingPaid}
                title={t("Markeer als betaald")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand text-xs font-semibold hover:bg-brand/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <Check className="size-3.5" />
                <span className="hidden sm:inline">{t("Markeer als betaald")}</span>
              </button>
            </div>
          )}
          <Link
            href={`/cashflow/invoices/new?edit=${invoice.id}`}
            title={t("Edit")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all"
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">{t("Edit")}</span>
          </Link>
          <CashflowPDFButton invoice={invoice} />
          <button
            onClick={handleDelete}
            disabled={deleting}
            title={t("Delete")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Factuurdetails */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{t("Factuurdetails")}</h2>
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-zinc-500">{t("Datum van facturering")}</dt>
              <dd className="text-xs text-zinc-200 text-right">{formatDate(invoice.dateCreated)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-zinc-500">{t("Datum van dienstverlening")}</dt>
              <dd className="text-xs text-zinc-200 text-right">{formatDate(invoice.dateService)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-zinc-500">{t("Vervaldatum")}</dt>
              <dd className="text-xs text-zinc-200 text-right">{formatDate(invoice.paymentDueDate)}</dd>
            </div>

            {(invoice.status === "paid" || invoice.datePaid) && (
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-zinc-800/60">
                <dt className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                  {t("Datum van betaling")}
                  <button
                    type="button"
                    onClick={() => setEditingPaidDate(!editingPaidDate)}
                    className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    title={t("Betaaldatum wijzigen")}
                  >
                    <Pencil className="size-3" />
                  </button>
                </dt>
                <dd className="text-xs text-zinc-200 text-right">
                  {editingPaidDate ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        defaultValue={invoice.datePaid ? new Date(invoice.datePaid).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                        onChange={e => handleUpdatePaidDate(e.target.value)}
                        className="text-xs bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-white focus:outline-none focus:border-brand"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-brand">{formatDate(invoice.datePaid)}</span>
                  )}
                </dd>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <dt className="text-xs text-zinc-500">{t("KOR (Kleineondernemersregeling)")}</dt>
              <dd className="text-xs text-zinc-200 text-right">{invoice.isKor ? "Van toepassing" : "Niet van toepassing"}</dd>
            </div>
          </dl>
        </div>

        {/* Klant & Handelsnaam */}
        <div className="space-y-3">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
              <User className="size-3.5" />{t("Klantgegevens")}
            </h2>
            <p className="text-sm font-semibold text-white">{invoice.clientName}</p>
            {invoice.clientAddress && <p className="text-xs text-zinc-400">{invoice.clientAddress}</p>}
            {invoice.clientEmail && <p className="text-xs text-zinc-500">{invoice.clientEmail}</p>}
            {invoice.clientKvk && <p className="text-xs text-zinc-500 flex items-center gap-1"><Hash className="size-3" />KVK {invoice.clientKvk}</p>}
          </div>
          {invoice.tradeNameDisplay && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="size-3.5" />{t("Handelsnaam")}
              </h2>
              <p className="text-sm font-semibold text-white">{invoice.tradeNameDisplay}</p>
              {invoice.tradeNameAddress && <p className="text-xs text-zinc-400">{invoice.tradeNameAddress}</p>}
              <div className="flex flex-wrap gap-2 mt-1">
                {invoice.tradeNameIban && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500"><CreditCard className="size-3" />{invoice.tradeNameIban}</span>
                )}
                {invoice.tradeNameKvk && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500"><Hash className="size-3" />KVK {invoice.tradeNameKvk}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{t("Factuurregels")}</h2>
        </div>

        {/* Mobile View Cards */}
        <div className="sm:hidden divide-y divide-zinc-800/80">
          {invoice.lines.map((line) => (
            <div key={line.id} className="p-3.5 space-y-1.5">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  {line.date && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60 inline-block mb-0.5">
                      {formatDate(line.date)}
                    </span>
                  )}
                  <p className="text-xs text-zinc-200 font-medium">{line.taskDescription}</p>
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${line.totalCost < 0 ? "text-emerald-400" : "text-white"}`}>
                  {formatEuro(line.totalCost)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-zinc-500">
                <span>
                  {line.type === "discount"
                    ? `${t("Korting")} (${line.discountType === "percentage" ? `${line.discountValue}%` : formatEuro(line.discountValue ?? 0)})`
                    : line.type === "hours"
                    ? `${line.quantity} uur × ${formatEuro(line.unitPrice)}`
                    : line.type === "travel_costs"
                    ? `${line.quantity} km × ${formatEuro(line.unitPrice)}`
                    : `${line.quantity} × ${formatEuro(line.unitPrice)}`}
                </span>
              </div>
            </div>
          ))}
          <div className="p-3.5 bg-zinc-950/40 flex justify-between items-center border-t border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400">{t("Factuurtotaal")}</span>
            <span className="text-base font-bold text-white">{formatEuro(invoice.total)}</span>
          </div>
        </div>

        {/* Desktop Table View */}
        <table className="hidden sm:table w-full text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-700">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">{t("Omschrijving")}</th>
              <th className="px-4 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">{t("Aantal")}</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase whitespace-nowrap min-w-[130px]">{t("Prijs / eenheid (€)")}</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase">{t("Totaal (€)")}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={line.id} className={`${i % 2 === 0 ? "" : "bg-zinc-900/50"} ${i === invoice.lines.length - 1 ? "border-b-2 border-zinc-700" : ""}`}>
                <td className="px-4 py-2.5 text-zinc-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    {line.date && (
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/60 shrink-0">
                        {formatDate(line.date)}
                      </span>
                    )}
                    <span>{line.taskDescription}</span>
                    {line.type === "discount" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t("Korting")} ({line.discountType === "percentage" ? `${line.discountValue}%` : formatEuro(line.discountValue ?? 0)})</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center text-zinc-400">
                  {line.type === "discount" ? "—" : line.type === "hours" ? `${line.quantity} uur` : line.type === "travel_costs" ? `${line.quantity} km` : line.quantity}
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-400">
                  {line.type === "discount" ? "—" : line.type === "hours" ? `${formatEuro(line.unitPrice)} / uur` : line.type === "travel_costs" ? `${formatEuro(line.unitPrice)} / km` : formatEuro(line.unitPrice)}
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold ${line.totalCost < 0 ? "text-emerald-400" : "text-white"}`}>
                  {formatEuro(line.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700">
              <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">{t("Factuurtotaal")}</td>
              <td className="px-4 py-3 text-right text-lg font-bold text-white">{formatEuro(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
        {invoice.isKor && (
          <div className="px-4 py-3 bg-zinc-950/20">
            <p className="text-xs text-zinc-500 italic">
              Op deze factuur is de KOR (Kleineondernemersregeling) van toepassing.
            </p>
          </div>
        )}
      </div>

      {/* Payment info */}
      {invoice.tradeNameIban && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">{t("BETALINGSINFORMATIE")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-zinc-500">{t("IBAN")}</p>
              <p className="text-sm font-mono text-white">{invoice.tradeNameIban}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("Betalingsreferentie")}</p>
              <p className="text-sm font-mono text-white">{invoice.invoiceNumber}</p>
            </div>
            {invoice.paymentDueDate && (
              <div>
                <p className="text-xs text-zinc-500">{t("Te betalen vóór")}</p>
                <p className="text-sm font-mono text-white">{formatDate(invoice.paymentDueDate)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
