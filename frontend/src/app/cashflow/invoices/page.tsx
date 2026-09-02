"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceSummary, CashflowClient, CashflowProject } from "@/lib/api";
import { Plus, FileText, Check, Clock, AlertCircle, Pencil, Trash2, Filter, X, Eye, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { CashflowPDFButton } from "@/components/cashflow-pdf";

type SortField = "number" | "client" | "date" | "dueDate" | "total";
type SortOrder = "asc" | "desc";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("nl-NL");
}

function SortHeaderIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy === field) {
    return sortOrder === "asc" ? (
      <ArrowUp className="size-3 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="size-3 text-blue-400 shrink-0" />
    );
  }
  return <ArrowUpDown className="size-3 text-zinc-600 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Concept", color: "bg-zinc-800 text-zinc-300 border-zinc-700", icon: FileText },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  paid: { label: "Betaald", color: "bg-brand/10 text-brand border-brand/20", icon: Check },
  overdue: { label: "Te laat", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertCircle },
  open: { label: "Openstaand", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
};

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedClientId = searchParams.get("clientId") ? Number(searchParams.get("clientId")) : undefined;
  const selectedProjectId = searchParams.get("projectId") ? Number(searchParams.get("projectId")) : undefined;
  const selectedYear = searchParams.get("year") || "";
  const filterStatus = searchParams.get("status") || "";
  const sortBy = (searchParams.get("sortBy") as SortField) || "date";
  const sortOrder = (searchParams.get("sortOrder") as SortOrder) || "desc";

  const [invoices, setInvoices] = useState<CashflowInvoiceSummary[]>([]);
  const [clients, setClients] = useState<CashflowClient[]>([]);
  const [projects, setProjects] = useState<CashflowProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cList, pList] = await Promise.all([
          api.cashflow.clients.list(),
          api.cashflow.projects.list(),
        ]);
        setClients(cList);
        setProjects(pList);
      } catch {}
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      try {
        setInvoices(await api.cashflow.invoices.list(undefined, selectedProjectId, selectedClientId));
      } catch {} finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [selectedProjectId, selectedClientId]);

  function updateUrl(cId?: number, pId?: number, yr?: string, st?: string, sBy?: string, sOrder?: string) {
    const params = new URLSearchParams();
    if (cId) params.set("clientId", String(cId));
    if (pId) params.set("projectId", String(pId));
    if (yr) params.set("year", yr);
    if (st) params.set("status", st);
    const effectiveSortBy = sBy !== undefined ? sBy : sortBy;
    const effectiveSortOrder = sOrder !== undefined ? sOrder : sortOrder;
    if (effectiveSortBy && (effectiveSortBy !== "date" || effectiveSortOrder !== "desc")) {
      params.set("sortBy", effectiveSortBy);
      params.set("sortOrder", effectiveSortOrder);
    }
    const qs = params.toString();
    router.replace(qs ? `/cashflow/invoices?${qs}` : "/cashflow/invoices", { scroll: false });
  }

  function handleClientChange(cIdStr: string) {
    const cId = cIdStr ? Number(cIdStr) : undefined;
    let pId = selectedProjectId;
    if (cId && pId) {
      const proj = projects.find(p => p.id === pId);
      if (proj && proj.clientId !== cId) {
        pId = undefined;
      }
    }
    updateUrl(cId, pId, selectedYear, filterStatus);
  }

  function handleProjectChange(pIdStr: string) {
    const pId = pIdStr ? Number(pIdStr) : undefined;
    let cId = selectedClientId;
    if (pId) {
      const proj = projects.find(p => p.id === pId);
      if (proj) {
        cId = proj.clientId;
      }
    }
    updateUrl(cId, pId, selectedYear, filterStatus);
  }

  function handleYearChange(yrStr: string) {
    updateUrl(selectedClientId, selectedProjectId, yrStr, filterStatus);
  }

  function handleStatusChange(stStr: string) {
    updateUrl(selectedClientId, selectedProjectId, selectedYear, stStr);
  }

  function handleResetFilters() {
    updateUrl(undefined, undefined, "", "");
  }

  function handleSortChange(newBy: SortField, newOrder: SortOrder) {
    updateUrl(selectedClientId, selectedProjectId, selectedYear, filterStatus, newBy, newOrder);
  }

  function handleHeaderSort(field: SortField) {
    if (sortBy === field) {
      const newOrder = sortOrder === "asc" ? "desc" : "asc";
      updateUrl(selectedClientId, selectedProjectId, selectedYear, filterStatus, field, newOrder);
    } else {
      const defaultOrder: SortOrder = (field === "date" || field === "total" || field === "dueDate") ? "desc" : "asc";
      updateUrl(selectedClientId, selectedProjectId, selectedYear, filterStatus, field, defaultOrder);
    }
  }

  async function handleMarkPaid(id: number) {
    setMarkingPaid(id);
    try {
      const updated = await api.cashflow.invoices.markAsPaid(id);
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: updated.status } : i));
    } catch {} finally { setMarkingPaid(null); }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("Deze factuur verwijderen?"))) return;
    setDeleting(id);
    try {
      await api.cashflow.invoices.delete(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch {} finally { setDeleting(null); }
  }

  const yearsInInvoices = Array.from(
    new Set(invoices.map(i => new Date(i.datePaid ?? i.dateCreated ?? now).getFullYear()))
  ).sort((a, b) => b - a);

  const currentYr = new Date(now).getFullYear();
  if (!yearsInInvoices.includes(currentYr)) {
    yearsInInvoices.unshift(currentYr);
  }
  if (selectedYear && !yearsInInvoices.includes(Number(selectedYear))) {
    yearsInInvoices.push(Number(selectedYear));
    yearsInInvoices.sort((a, b) => b - a);
  }

  const filtered = invoices.filter(i => {
    if (filterStatus === "open") {
      if (i.status !== "sent" && i.status !== "overdue") return false;
    } else if (filterStatus && i.status !== filterStatus) {
      return false;
    }

    if (selectedYear) {
      const invYear = new Date(i.datePaid ?? i.dateCreated ?? now).getFullYear();
      if (invYear !== Number(selectedYear)) return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "number") {
      cmp = (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (sortBy === "client") {
      const aClient = (a.clientName || "").trim();
      const bClient = (b.clientName || "").trim();
      cmp = aClient.localeCompare(bClient, "nl", { sensitivity: "base" });
      if (cmp === 0) {
        const aProj = (a.projectName || a.name || "").trim();
        const bProj = (b.projectName || b.name || "").trim();
        cmp = aProj.localeCompare(bProj, "nl", { sensitivity: "base" });
      }
    } else if (sortBy === "dueDate") {
      const aVal = a.paymentDueDate ?? (sortOrder === "asc" ? Infinity : -Infinity);
      const bVal = b.paymentDueDate ?? (sortOrder === "asc" ? Infinity : -Infinity);
      cmp = aVal - bVal;
    } else if (sortBy === "total") {
      cmp = (a.total ?? 0) - (b.total ?? 0);
    } else {
      cmp = (a.dateCreated ?? 0) - (b.dateCreated ?? 0);
    }

    if (cmp === 0) {
      return (b.dateCreated ?? 0) - (a.dateCreated ?? 0);
    }

    return sortOrder === "desc" ? -cmp : cmp;
  });

  const totalVisible = filtered.reduce((s, i) => s + i.total, 0);

  const availableProjects = selectedClientId
    ? projects.filter(p => p.clientId === selectedClientId)
    : projects;

  const hasActiveFilters = Boolean(selectedClientId || selectedProjectId || selectedYear || filterStatus);

  const statusPills = [
    { value: "", label: t("Alle") },
    { value: "open", label: t("Openstaand") },
    { value: "paid", label: t("Betaald") },
    { value: "sent", label: t("Verzonden") },
    { value: "overdue", label: t("Te laat") },
    { value: "draft", label: t("Concept") },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="size-5 text-blue-400" />{t("Facturen")}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">{filtered.length} facturen · {formatEuro(totalVisible)}</p>
        </div>
        <Link href="/cashflow/invoices/new">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
            <Plus className="size-4" />{t("Nieuwe factuur")}
          </button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mr-1">
              <Filter className="size-3.5 text-blue-400" />
              <span>{t("Filter op")}:</span>
            </div>

            {/* Client Select */}
            <select
              value={selectedClientId ?? ""}
              onChange={e => handleClientChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs leading-none text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">{t("Alle klanten")}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Project Select */}
            <select
              value={selectedProjectId ?? ""}
              onChange={e => handleProjectChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs leading-none text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">{t("Alle projecten")}</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={e => handleYearChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">{t("Alle jaren")}</option>
              {yearsInInvoices.map(y => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                title={t("Wis filters")}
              >
                <X className="size-3.5" />
                <span>{t("Wis filters")}</span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <ArrowUpDown className="size-3.5 text-blue-400 shrink-0" />
            <span className="shrink-0">{t("Sorteer op")}:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [newBy, newOrder] = e.target.value.split("-") as [SortField, SortOrder];
                handleSortChange(newBy, newOrder);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs leading-none text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="date-desc">{t("Datum (nieuwste eerst)")}</option>
              <option value="date-asc">{t("Datum (oudste eerst)")}</option>
              <option value="number-desc">{t("Factuurnummer (aflopend)")}</option>
              <option value="number-asc">{t("Factuurnummer (oplopend)")}</option>
              <option value="client-asc">{t("Klant (A - Z)")}</option>
              <option value="client-desc">{t("Klant (Z - A)")}</option>
              <option value="dueDate-asc">{t("Vervaldatum (eerst)")}</option>
              <option value="dueDate-desc">{t("Vervaldatum (laatst)")}</option>
              <option value="total-desc">{t("Totaal (hoog - laag)")}</option>
              <option value="total-asc">{t("Totaal (laag - hoog)")}</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
          {statusPills.map(sp => (
            <button
              key={sp.value}
              onClick={() => handleStatusChange(sp.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                filterStatus === sp.value
                  ? sp.value && statusConfig[sp.value] ? statusConfig[sp.value].color : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FileText className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen facturen gevonden.")}</p>
          <Link href="/cashflow/invoices/new" className="mt-3 text-xs text-blue-400 hover:text-blue-300 inline-block">{t("Maak je eerste factuur aan")}</Link>
        </div>
      ) : (
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
            const isOverdue = inv.status !== "paid" && Boolean(inv.paymentDueDate && inv.paymentDueDate < now);

            return (
              <div key={inv.id}>
                {/* Desktop view row */}
                <div
                  onClick={() => router.push(`/cashflow/invoices/${inv.id}`)}
                  className={`hidden sm:grid sm:grid-cols-[160px_1.5fr_1fr_1fr_110px_165px] gap-4 items-center px-4 py-3 bg-zinc-900 border rounded-xl transition-colors cursor-pointer ${
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
                      <p className="text-xs text-zinc-600">—</p>
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
                  className={`sm:hidden p-4 bg-zinc-900 border rounded-xl space-y-3 cursor-pointer hover:border-zinc-700 transition-colors ${
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
      )}
    </div>
  );
}

