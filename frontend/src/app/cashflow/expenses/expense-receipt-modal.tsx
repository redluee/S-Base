"use client";

import { t } from "@/lib/lang";
import type { CashflowExpense } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import {
  X,
  FileText,
  ExternalLink,
  Download,
} from "lucide-react";

export function ExpenseReceiptModal({
  expense,
  onClose,
}: {
  expense: CashflowExpense;
  onClose: () => void;
}) {
  if (!expense.receiptPdfPath) return null;
  const isPdf = expense.receiptPdfPath.toLowerCase().endsWith(".pdf");

  return (
    <ModalOverlay
      open
      onClose={onClose}
      label={`${expense.description} — ${t("Bon / Factuur")}`}
      className="p-3 sm:p-6"
      backdropClassName="bg-black/80"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">
                {expense.description} — {t("Bon / Factuur")}
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                {expense.receiptPdfName || "Bon.pdf"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={expense.receiptPdfPath}
              download={expense.receiptPdfName || "bon.pdf"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t("Downloaden")}</span>
            </a>
            <a
              href={expense.receiptPdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">{t("Openen in nieuw tabblad")}</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label={t("Sluiten")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="relative flex-1 min-h-[60vh] sm:min-h-[72vh] bg-zinc-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
          {isPdf ? (
            <iframe
              src={expense.receiptPdfPath}
              title={expense.receiptPdfName || "Receipt PDF"}
              className="w-full h-full min-h-[58vh] sm:min-h-[70vh] rounded-xl border border-zinc-800 bg-zinc-900"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expense.receiptPdfPath}
              alt={expense.receiptPdfName || "Receipt preview"}
              className="max-h-[70vh] max-w-full object-contain rounded-xl border border-zinc-800"
            />
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
