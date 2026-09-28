"use client";

import { useState, useCallback } from "react";
import { Mail, AlertTriangle, X, Send } from "lucide-react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceFull } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { buildInvoicePDFBlob, getInvoiceValidationWarnings } from "@/components/cashflow-pdf";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

function defaultSubject(invoice: CashflowInvoiceFull) {
  return `Factuur ${invoice.invoiceNumber}`;
}

function defaultBody(invoice: CashflowInvoiceFull) {
  const lines = [
    `Beste ${invoice.clientName},`,
    "",
    `Hierbij ontvangt u factuur ${invoice.invoiceNumber}${invoice.projectName ? ` voor ${invoice.projectName}` : ""} ter waarde van ${formatEuro(invoice.total)}.`,
  ];
  if (invoice.paymentDueDate) {
    lines.push(`Graag ontvang ik de betaling voor ${formatDate(invoice.paymentDueDate)}.`);
  }
  lines.push("", "Met vriendelijke groet,");
  return lines.join("\n");
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

interface CashflowEmailButtonProps {
  invoice: CashflowInvoiceFull;
  onSent?: (invoice: CashflowInvoiceFull) => void;
}

export function CashflowEmailButton({ invoice, onSent }: CashflowEmailButtonProps) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const openCompose = useCallback(() => {
    setTo(invoice.clientEmail ?? "");
    setSubject(defaultSubject(invoice));
    setBody(defaultBody(invoice));
    setError("");
    setShowComposeModal(true);
  }, [invoice]);

  const handleClick = useCallback(() => {
    const warns = getInvoiceValidationWarnings(invoice);
    if (!invoice.clientEmail?.trim()) warns.unshift("E-mailadres van de klant ontbreekt");
    if (warns.length > 0) {
      setWarnings(warns);
      setShowWarningModal(true);
    } else {
      openCompose();
    }
  }, [invoice, openCompose]);

  const handleSend = useCallback(async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError(t("Vul alle velden in"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const pdfBlob = await buildInvoicePDFBlob(invoice);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const updated = await api.cashflow.invoices.sendEmail(invoice.id, {
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        pdfBase64,
      });
      setShowComposeModal(false);
      onSent?.(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Versturen mislukt"));
    } finally {
      setSending(false);
    }
  }, [to, subject, body, invoice, onSent]);

  const warningModal = showWarningModal && (
    <ModalOverlay
      open
      onClose={() => setShowWarningModal(false)}
      label={t("Waarschuwing bij e-mail versturen")}
      backdropClassName="bg-black/70"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <h3 className="text-base font-bold text-white">{t("Waarschuwing bij e-mail versturen")}</h3>
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
            onClick={() => { setShowWarningModal(false); openCompose(); }}
            disabled={!invoice.clientEmail?.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {t("Toch doorgaan")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );

  const composeModal = showComposeModal && (
    <ModalOverlay
      open
      onClose={() => !sending && setShowComposeModal(false)}
      label={t("E-mail versturen")}
      backdropClassName="bg-black/70"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-xl text-left">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white">{t("Factuur e-mailen")}</h3>
          <button
            onClick={() => !sending && setShowComposeModal(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">{t("Aan")}</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">{t("Onderwerp")}</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">{t("Bericht")}</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand resize-none"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            {t("De factuur wordt als PDF-bijlage meegestuurd.")}
          </p>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setShowComposeModal(false)}
            disabled={sending}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("Annuleren")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand hover:bg-brand/90 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            <Send className="size-3.5" />
            {sending ? t("Versturen...") : t("Verzenden")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );

  return (
    <div>
      <button
        onClick={handleClick}
        title={t("E-mail versturen")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all cursor-pointer"
      >
        <Mail className="size-3.5" />
        <span className="hidden sm:inline">{t("E-mail versturen")}</span>
      </button>
      {warningModal}
      {composeModal}
    </div>
  );
}
