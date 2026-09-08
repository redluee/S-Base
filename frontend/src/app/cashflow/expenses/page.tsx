"use client";

import { useState, useEffect, useRef } from "react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowExpense, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  FileText,
  Upload,
  ExternalLink,
  Download,
  Eye,
  Loader2,
  Calendar,
  Tag,
  Search,
} from "lucide-react";
import { YearSelector } from "@/components/year-selector";

const DEFAULT_CATEGORIES = [
  "Software & Abonnementen",
  "Hardware & Apparatuur",
  "Kantoor & Werkplek",
  "Reiskosten",
  "Marketing & Verkoop",
  "Administratie & Verzekeringen",
  "Overig",
];

function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(timestamp: number | null | undefined) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ExpenseReceiptModal({
  expense,
  onClose,
}: {
  expense: CashflowExpense;
  onClose: () => void;
}) {
  if (!expense.receiptPdfPath) return null;
  const isPdf = expense.receiptPdfPath.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">
                {expense.description} — {t("Bon / Factuur")}
              </h3>
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
    </div>
  );
}

function ExpenseForm({
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
      <h3 className="text-sm font-semibold text-white">
        {initial?.id ? t("Uitgave bewerken") : t("Nieuwe uitgave")}
      </h3>

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

export default function ExpensesPage() {
  const [items, setItems] = useState<CashflowExpense[]>([]);
  const [tradeNames, setTradeNames] = useState<CashflowTradeName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashflowExpense | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [viewingReceiptExpense, setViewingReceiptExpense] = useState<CashflowExpense | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tradeNameFilter, setTradeNameFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.cashflow.expenses.list({ year: selectedYear }),
      api.cashflow.tradeNames.list(),
    ])
      .then(([expensesRes, tradeNamesRes]) => {
        if (active) {
          setItems(expensesRes);
          setTradeNames(tradeNamesRes);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  async function handleSave(
    data: Omit<CashflowExpense, "id" | "userId" | "tradeNameDisplay" | "createdAt">
  ) {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.cashflow.expenses.update(editing.id, data);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
      } else {
        const created = await api.cashflow.expenses.create(data);
        setItems((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("Deze uitgave verwijderen?"))) return;
    setDeleting(id);
    try {
      await api.cashflow.expenses.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (tradeNameFilter !== "all") {
      if (tradeNameFilter === "none" && item.tradeNameId !== null) return false;
      if (tradeNameFilter !== "none" && String(item.tradeNameId) !== tradeNameFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchDesc && !matchNotes && !matchCat) return false;
    }
    return true;
  });

  const totalFilteredAmount = filteredItems.reduce((s, i) => s + (i.amount || 0), 0);
  const categoriesList = Array.from(new Set(items.map((i) => i.category || "Overig")));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="size-5 text-blue-400" />
            {t("Uitgaven")}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {filteredItems.length} {filteredItems.length === 1 ? "uitgave" : "uitgaven"} in {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector year={selectedYear} onChange={setSelectedYear} />
          {!showForm && !editing && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5"
            >
              <Plus className="size-3.5 mr-1" />
              {t("Nieuwe uitgave")}
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t("Totale uitgaven")}</span>
            <Receipt className="size-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-white">{formatEuro(totalFilteredAmount)}</p>
          <p className="text-[11px] text-zinc-500">
            {selectedYear} • {filteredItems.length} posten
          </p>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t("Categorieën")}</span>
            <Tag className="size-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white">{categoriesList.length}</p>
          <p className="text-[11px] text-zinc-500">Actieve kostenposten</p>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t("Gemiddeld per uitgave")}</span>
            <Calendar className="size-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {formatEuro(filteredItems.length > 0 ? totalFilteredAmount / filteredItems.length : 0)}
          </p>
          <p className="text-[11px] text-zinc-500">In geselecteerde selectie</p>
        </div>
      </div>

      {/* Form Area */}
      {showForm && !editing && (
        <ExpenseForm
          tradeNames={tradeNames}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
        <div className="relative flex-1">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek in uitgaven..."
            className="pl-8 bg-zinc-850 border-zinc-750 text-xs h-8"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-zinc-750 bg-zinc-850 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
          >
            <option value="all">{t("Alle categorieën")}</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {tradeNames.length > 0 && (
            <select
              value={tradeNameFilter}
              onChange={(e) => setTradeNameFilter(e.target.value)}
              className="rounded-lg border border-zinc-750 bg-zinc-850 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">{t("Alle handelsnamen")}</option>
              <option value="none">{t("Geen handelsnaam")}</option>
              {tradeNames.map((tn) => (
                <option key={tn.id} value={String(tn.id)}>
                  {tn.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Expense Items List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredItems.length === 0 && !showForm ? (
        <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
          <Receipt className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen uitgaven gevonden.")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {t("Voeg je eerste uitgave toe")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id}>
              {editing?.id === item.id ? (
                <ExpenseForm
                  initial={editing}
                  tradeNames={tradeNames}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  loading={saving}
                />
              ) : (
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{item.description}</p>
                      {item.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300">
                          {item.category}
                        </span>
                      )}
                      {item.tradeNameDisplay && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400">
                          <Building2 className="size-3" />
                          {item.tradeNameDisplay}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-zinc-500" />
                        {formatDate(item.date)}
                      </span>
                      {item.notes && (
                        <span className="text-zinc-500 truncate max-w-xs">• {item.notes}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {formatEuro(item.amount)}
                    </span>

                    {item.receiptPdfPath && (
                      <button
                        onClick={() => setViewingReceiptExpense(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition-colors cursor-pointer"
                        title={t("Bon bekijken")}
                      >
                        <FileText className="size-3.5" />
                        <span className="hidden sm:inline">{t("Bon")}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("Bewerken")}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t("Verwijderen")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Receipt Lightbox Modal */}
      {viewingReceiptExpense && (
        <ExpenseReceiptModal
          expense={viewingReceiptExpense}
          onClose={() => setViewingReceiptExpense(null)}
        />
      )}
    </div>
  );
}
