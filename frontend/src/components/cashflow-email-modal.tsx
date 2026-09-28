"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Mail, X, Send, Loader2 } from "lucide-react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceFull } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { buildInvoicePDFBlob } from "@/components/cashflow-pdf";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}
function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const URL_OR_DOMAIN_PATTERN = /(https?:\/\/[^\s<]+)|(\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b)/g;

// Mirrors backend/src/lib/mailer.ts textToHtml() so the preview matches what actually gets sent.
function linkifyMessageHtml(text: string): string {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(URL_OR_DOMAIN_PATTERN, (match, httpUrl, bareDomain) => {
    const href = httpUrl ?? `https://${bareDomain}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-brand underline">${match}</a>`;
  });
  return linked.replace(/\n/g, "<br>");
}

function buildDefaultMessage(invoice: CashflowInvoiceFull): string {
  const clientName = invoice.clientName || "";
  const total = formatEuro(invoice.total);
  const subject = invoice.projectName || invoice.name || "";
  const dueDate = invoice.paymentDueDate ? formatDate(invoice.paymentDueDate) : "";

  let msg = `Beste ${clientName},\n\nHierbij ontvangt u factuur ${invoice.invoiceNumber}`;
  if (subject) msg += ` voor ${subject}`;
  msg += ` ter waarde van ${total}.`;
  if (dueDate) msg += `\nGraag ontvang ik de betaling voor ${dueDate}.`;
  msg += `\n\nMet vriendelijke groet,\nSteven Heijn\nFotografie & Software/Website Development\nStevenHeijn.nl`;
  return msg;
}

interface CashflowEmailInvoiceModalProps {
  invoice: CashflowInvoiceFull;
  onClose: () => void;
  onSent?: () => void;
}

function CashflowEmailInvoiceModal({ invoice, onClose, onSent }: CashflowEmailInvoiceModalProps) {
  const [to, setTo] = useState(invoice.clientEmail || "");
  const [subject, setSubject] = useState(`Factuur ${invoice.invoiceNumber}`);
  const [message, setMessage] = useState(() => buildDefaultMessage(invoice));
  const messageHtml = useMemo(() => linkifyMessageHtml(message), [message]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const pdfBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const blob = await buildInvoicePDFBlob(invoice);
        if (cancelled) return;
        pdfBlobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) setPreviewError(t("PDF-voorbeeld kon niet worden geladen"));
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice]);

  const handleSend = useCallback(async () => {
    setError("");
    if (!to.trim()) {
      setError(t("Vul een geldig e-mailadres in"));
      return;
    }
    setSending(true);
    try {
      const blob = pdfBlobRef.current ?? (await buildInvoicePDFBlob(invoice));
      const pdfBase64 = await blobToBase64(blob);
      await api.cashflow.invoices.sendEmail(invoice.id, {
        to: to.trim(),
        subject: subject.trim(),
        message,
        pdfBase64,
      });
      onSent?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Fout bij verzenden e-mail"));
    } finally {
      setSending(false);
    }
  }, [to, subject, message, invoice, onClose, onSent]);

  return (
    <ModalOverlay open onClose={onClose} label={t("Factuur e-mailen")} backdropClassName="bg-black/70">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[92vw] max-w-5xl h-[88vh] shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-brand" />
            <h3 className="text-base font-bold text-white">{t("Factuur e-mailen")}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Form */}
          <div className="lg:w-[380px] shrink-0 p-5 space-y-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">{t("Aan")}</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full text-sm bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand"
                placeholder="naam@bedrijf.nl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">{t("Onderwerp")}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">{t("Bericht")}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="w-full text-sm bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">{t("Voorbeeld van bericht")}</label>
              <div
                className="w-full text-sm bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 break-words"
                dangerouslySetInnerHTML={{ __html: messageHtml }}
              />
            </div>

            <p className="text-xs text-zinc-500">
              {t("De factuur wordt als PDF-bijlage meegestuurd.")}
            </p>

            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 bg-zinc-950/40 p-3 sm:p-4">
            {previewUrl ? (
              <iframe title={t("PDF-voorbeeld")} src={previewUrl} className="w-full h-full rounded-lg bg-white border border-zinc-800" />
            ) : previewError ? (
              <div className="flex items-center justify-center h-full text-xs text-rose-400">{previewError}</div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("Annuleren")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-brand hover:bg-brand/90 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {sending ? t("Verzenden...") : t("Verzenden")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

interface CashflowEmailInvoiceButtonProps {
  invoice?: CashflowInvoiceFull;
  invoiceId?: number;
  iconOnly?: boolean;
  onSent?: () => void;
}

export function CashflowEmailInvoiceButton({ invoice: initialInvoice, invoiceId, iconOnly, onSent }: CashflowEmailInvoiceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<CashflowInvoiceFull | null>(initialInvoice ?? null);
  const [error, setError] = useState("");

  const handleClick = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (initialInvoice) {
      setInvoice(initialInvoice);
      setOpen(true);
      return;
    }
    if (!invoiceId) return;
    setLoading(true);
    setError("");
    try {
      const inv = await api.cashflow.invoices.get(invoiceId);
      setInvoice(inv);
      setOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("Fout bij ophalen factuur"));
    } finally {
      setLoading(false);
    }
  }, [initialInvoice, invoiceId]);

  const buttonClass = iconOnly
    ? "p-1.5 rounded-lg text-zinc-400 hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer disabled:opacity-60"
    : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 cursor-pointer";

  return (
    <div className={iconOnly ? "inline-flex items-center" : ""}>
      <button onClick={handleClick} disabled={loading} title={t("Factuur e-mailen")} className={buttonClass}>
        {loading ? (
          <div className="size-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        ) : (
          <Mail className="size-3.5" />
        )}
        {!iconOnly && <span className="hidden sm:inline">{t("Mailen")}</span>}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      {open && invoice && (
        <CashflowEmailInvoiceModal
          invoice={invoice}
          onClose={() => setOpen(false)}
          onSent={onSent}
        />
      )}
    </div>
  );
}
