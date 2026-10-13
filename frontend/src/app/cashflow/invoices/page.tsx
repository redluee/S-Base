"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceSummary, CashflowClient, CashflowProject } from "@/lib/api";
import {
  Plus,
  FileText,
  Filter,
  X,
  ArrowUpDown,
} from "lucide-react";
import { InvoiceList } from "./invoice-list";
import {
  formatEuro,
  getInvoiceCreationTimestamp,
  getInvoiceYear,
  type SortField,
  statusConfig,
  type SortOrder,
} from "./invoice-utils";


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
    new Set(invoices.map(i => getInvoiceYear(i, now)))
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
      const invYear = getInvoiceYear(i, now);
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
      cmp = getInvoiceCreationTimestamp(a) - getInvoiceCreationTimestamp(b);
    }

    if (cmp === 0) {
      return b.id - a.id;
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
              <option value="date-desc">{t("Aanmaakdatum (nieuwste eerst)")}</option>
              <option value="date-asc">{t("Aanmaakdatum (oudste eerst)")}</option>
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
        <InvoiceList
          sorted={sorted}
          sortBy={sortBy}
          sortOrder={sortOrder}
          now={now}
          markingPaid={markingPaid}
          deleting={deleting}
          handleHeaderSort={handleHeaderSort}
          handleMarkPaid={handleMarkPaid}
          handleDelete={handleDelete}
        />
      )}
    </div>
  );
}

