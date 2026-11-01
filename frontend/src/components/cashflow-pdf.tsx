"use client";

import { useState, useCallback } from "react";
import { Download, AlertTriangle, X } from "lucide-react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceFull } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { buildInvoicePDFBlob } from "./cashflow-pdf-builder";

export { buildInvoicePDFBlob };

export function getInvoiceValidationWarnings(invoice: CashflowInvoiceFull): string[] {
  const warnings: string[] = [];

  if (!invoice.invoiceNumber?.trim()) {
    warnings.push("Factuurnummer ontbreekt");
  }
  if (!invoice.clientName?.trim()) {
    warnings.push("Klant ontbreekt");
  }
  if (!invoice.projectName?.trim() && !invoice.name?.trim()) {
    warnings.push("Projectnaam ontbreekt");
  }
  if (!invoice.dateCreated) {
    warnings.push("Datum van facturering ontbreekt");
  }
  if (!invoice.dateService) {
    warnings.push("Datum van dienstverlening ontbreekt");
  }
  if (!invoice.paymentDueDate) {
    warnings.push("Vervaldatum ontbreekt");
  }

  if (!invoice.lines || invoice.lines.length === 0) {
    warnings.push("Er zijn geen factuurregels toegevoegd");
  } else {
    invoice.lines.forEach((line, index) => {
      const lineNum = index + 1;
      if (!line.taskDescription?.trim()) {
        warnings.push(`Factuurregel ${lineNum}: Omschrijving ontbreekt`);
      }
      if (line.type !== "discount") {
        if (line.quantity === null || line.quantity === undefined || String(line.quantity).trim() === "" || Number(line.quantity) <= 0) {
          warnings.push(`Factuurregel ${lineNum}: Aantal is niet correct ingevuld`);
        }
        if (line.unitPrice === null || line.unitPrice === undefined || String(line.unitPrice).trim() === "" || Number(line.unitPrice) < 0) {
          warnings.push(`Factuurregel ${lineNum}: Prijs per eenheid is niet correct ingevuld`);
        }
      } else {
        if (line.discountValue === null || line.discountValue === undefined || String(line.discountValue).trim() === "" || Number(line.discountValue) <= 0) {
          warnings.push(`Factuurregel ${lineNum}: Kortingswaarde is niet correct ingevuld`);
        }
      }
    });
  }

  return warnings;
}

interface CashflowPDFButtonProps {
  invoice?: CashflowInvoiceFull;
  invoiceId?: number;
  iconOnly?: boolean;
}

export function CashflowPDFButton({ invoice: initialInvoice, invoiceId, iconOnly }: CashflowPDFButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetInvoice, setTargetInvoice] = useState<CashflowInvoiceFull | null>(initialInvoice ?? null);

  const startDownload = useCallback(async (invToUse?: CashflowInvoiceFull) => {
    const activeInvoice = invToUse ?? targetInvoice ?? initialInvoice;
    if (!activeInvoice) return;
    setLoading(true);
    setError("");
    setShowWarningModal(false);
    try {
      await buildAndDownloadPDF(activeInvoice);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF fout");
    } finally {
      setLoading(false);
    }
  }, [initialInvoice, targetInvoice]);

  const handleClick = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      let inv = initialInvoice;
      if (!inv && invoiceId) {
        inv = await api.cashflow.invoices.get(invoiceId);
      }
      if (!inv) {
        setLoading(false);
        return;
      }
      setTargetInvoice(inv);
      const w = getInvoiceValidationWarnings(inv);
      if (w.length > 0) {
        setWarnings(w);
        setShowWarningModal(true);
        setLoading(false);
      } else {
        await startDownload(inv);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij ophalen factuur");
      setLoading(false);
    }
  }, [initialInvoice, invoiceId, startDownload]);

  const modal = showWarningModal && (
    <ModalOverlay
      open
      onClose={() => setShowWarningModal(false)}
      label={t("Waarschuwing bij PDF downloaden")}
      backdropClassName="bg-black/70"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <h3 className="text-base font-bold text-white">{t("Waarschuwing bij PDF downloaden")}</h3>
          </div>
          <button
            onClick={() => setShowWarningModal(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>
        
        <p className="text-xs text-zinc-400">
          {t("De volgende velden op deze factuur zijn leeg of niet correct ingevuld:")}
        </p>

        <ul className="space-y-1.5 max-h-48 overflow-y-auto p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 text-xs text-zinc-300 list-disc list-inside">
          {warnings.map((w, idx) => (
            <li key={idx} className="text-amber-200/90">{w}</li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setShowWarningModal(false)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("Annuleren")}
          </button>
          <button
            onClick={() => startDownload()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
          >
            {t("Toch downloaden")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );

  if (iconOnly) {
    return (
      <div className="inline-flex items-center">
        <button
          onClick={handleClick}
          disabled={loading}
          title={loading ? t("PDF genereren...") : t("PDF downloaden")}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <div className="size-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
        </button>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {modal}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        title={loading ? t("PDF genereren...") : t("PDF downloaden")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 cursor-pointer"
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">{loading ? t("PDF genereren...") : t("PDF downloaden")}</span>
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      {modal}
    </div>
  );
}

async function buildAndDownloadPDF(invoice: CashflowInvoiceFull) {
  const blob = await buildInvoicePDFBlob(invoice);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factuur-${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
