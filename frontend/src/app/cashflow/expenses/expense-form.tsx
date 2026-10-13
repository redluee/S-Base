"use client";

import { useState, useRef } from "react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowExpense, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  X,
  Check,
  FileText,
  Upload,
  Eye,
  Loader2,
} from "lucide-react";
import { DEFAULT_CATEGORIES } from "./expense-utils";

export function ExpenseForm({
  initial,
  tradeNames,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<CashflowExpense>;
  tradeNames: CashflowTradeName[];
  onSave: (data: Omit<CashflowExpense, "id" | "userId" | "tradeNameDisplay" | "createdAt">) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Software & Abonnementen");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(
    initial?.category ? !DEFAULT_CATEGORIES.includes(initial.category) : false
  );
  const [date, setDate] = useState(() => {
    if (initial?.date) {
      return new Date(initial.date).toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [tradeNameId, setTradeNameId] = useState<string>(
    initial?.tradeNameId ? String(initial.tradeNameId) : ""
  );
  const [receiptPdfPath, setReceiptPdfPath] = useState(initial?.receiptPdfPath ?? "");
  const [receiptPdfName, setReceiptPdfName] = useState(initial?.receiptPdfName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploadingReceipt(true);
    try {
      const res = await api.cashflow.upload(file, file.name);
      setReceiptPdfPath(res.filePath);
      setReceiptPdfName(file.name || res.originalName || "Bon.pdf");
    } catch {
      setError(t("Bestand uploaden mislukt"));
    } finally {
      setUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveReceipt() {
    setReceiptPdfPath("");
    setReceiptPdfName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError(t("Omschrijving van de uitgave is verplicht."));
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t("Bedrag is verplicht en moet groter zijn dan 0."));
      return;
    }

    setError("");
    const finalCategory = isCustomCategory ? customCategory.trim() || "Overig" : category;
    const dateTimestamp = date ? new Date(date).getTime() : Date.now();

    onSave({
      description: description.trim(),
      amount: numAmount,
      category: finalCategory,
      date: dateTimestamp,
      tradeNameId: tradeNameId ? Number(tradeNameId) : null,
      receiptPdfPath: receiptPdfPath.trim() || null,
      receiptPdfName: receiptPdfName.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h2 className="text-sm font-semibold text-white">
        {initial?.id ? t("Uitgave bewerken") : t("Nieuwe uitgave")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Description */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Omschrijving")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
            placeholder="bijv. Server hosting, Adobe abonnement, Monitor"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("Bedrag (€)")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
            placeholder="0.00"
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("Datum")}</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("Categorie")}</Label>
          <select
            value={isCustomCategory ? "__custom__" : category}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setIsCustomCategory(true);
              } else {
                setIsCustomCategory(false);
                setCategory(e.target.value);
              }
            }}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(cat)}
              </option>
            ))}
            <option value="__custom__">+ {t("Aangepaste categorie...")}</option>
          </select>
          {isCustomCategory && (
            <Input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-2 bg-zinc-800 border-zinc-700"
              placeholder="Typ aangepaste categorie..."
            />
          )}
        </div>

        {/* Trade Name */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("Handelsnaam")}</Label>
          <select
            value={tradeNameId}
            onChange={(e) => setTradeNameId(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t("Geen handelsnaam")}</option>
            {tradeNames.map((tn) => (
              <option key={tn.id} value={tn.id}>
                {tn.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Notities (optioneel)")}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
            placeholder="Extra details of referentienummer..."
          />
        </div>

        {/* Receipt / Invoice Upload Section */}
        <div className="space-y-2 sm:col-span-2 pt-2 border-t border-zinc-800/80">
          <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <FileText className="size-3.5 text-blue-400" />
            {t("Bon / Factuur (PDF of afbeelding)")}
          </Label>

          {receiptPdfPath ? (
            <div className="flex items-center justify-between p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {receiptPdfName || "Bon.pdf"}
                  </p>
                  <p className="text-[11px] text-zinc-400">{t("Bijlage gekoppeld")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={receiptPdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                  title={t("Bon bekijken")}
                >
                  <Eye className="size-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("Bon wijzigen")}
                >
                  <Upload className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("Bon verwijderen")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 hover:border-blue-500/60 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 transition-all cursor-pointer text-center"
            >
              {uploadingReceipt ? (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t("Bezig met opslaan...")}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="size-5 mx-auto text-zinc-400 group-hover:text-blue-400 transition-colors" />
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-white">
                    {t("Bon toevoegen")}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {t("Upload een bon of factuur")}
                  </p>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button
          type="button"
          onClick={onCancel}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5"
        >
          <X className="size-3.5 mr-1" />
          {t("Annuleer")}
        </Button>
        <Button
          type="submit"
          disabled={loading || uploadingReceipt}
          className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5"
        >
          <Check className="size-3.5 mr-1" />
          {loading ? t("Bezig met opslaan...") : t("Save")}
        </Button>
      </div>
    </form>
  );
}
