"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceSummary, CashflowClient, CashflowProject } from "@/lib/api";
import { Plus, FileText, Check, Clock, AlertCircle, Pencil, Trash2, Download, Filter, X } from "lucide-react";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("nl-NL");
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Concept", color: "bg-zinc-800 text-zinc-300 border-zinc-700", icon: FileText },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  paid: { label: "Betaald", color: "bg-brand/10 text-brand border-brand/20", icon: Check },
  overdue: { label: "Te laat", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertCircle },
};

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(() =>
    searchParams.get("clientId") ? Number(searchParams.get("clientId")) : undefined
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(() =>
    searchParams.get("projectId") ? Number(searchParams.get("projectId")) : undefined
  );
  const [filterStatus, setFilterStatus] = useState("");

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
    const cid = searchParams.get("clientId") ? Number(searchParams.get("clientId")) : undefined;
    const pid = searchParams.get("projectId") ? Number(searchParams.get("projectId")) : undefined;
    setSelectedClientId(cid);
    setSelectedProjectId(pid);
  }, [searchParams]);

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

  function updateUrl(cId?: number, pId?: number) {
    const params = new URLSearchParams();
    if (cId) params.set("clientId", String(cId));
    if (pId) params.set("projectId", String(pId));
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
    setSelectedClientId(cId);
    setSelectedProjectId(pId);
    updateUrl(cId, pId);
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
    setSelectedProjectId(pId);
    setSelectedClientId(cId);
    updateUrl(cId, pId);
  }

  function handleResetFilters() {
    setSelectedClientId(undefined);
    setSelectedProjectId(undefined);
    setFilterStatus("");
    updateUrl(undefined, undefined);
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

  const filtered = invoices.filter(i => !filterStatus || i.status === filterStatus);
  const totalVisible = filtered.reduce((s, i) => s + i.total, 0);

  const availableProjects = selectedClientId
    ? projects.filter(p => p.clientId === selectedClientId)
    : projects;

  const hasActiveFilters = Boolean(selectedClientId || selectedProjectId || filterStatus);

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
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
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
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">{t("Alle projecten")}</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
          {["", "draft", "sent", "paid", "overdue"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                filterStatus === s
                  ? s ? statusConfig[s].color : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {s ? t(s) : t("Alle")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FileText className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen facturen gevonden.")}</p>
          <Link href="/cashflow/invoices/new" className="mt-3 text-xs text-blue-400 hover:text-blue-300 inline-block">{t("Maak je eerste factuur aan")}</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop table header */}
          <div className="hidden sm:grid sm:grid-cols-[170px_1.5fr_1fr_1fr_110px_120px] gap-4 px-4 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div>{t("Nummer")}</div>
            <div>{t("Klant / Project")}</div>
            <div>{t("Datum")}</div>
            <div>{t("Vervaldatum")}</div>
            <div className="text-right">{t("Totaal")}</div>
            <div className="text-right">{t("Acties")}</div>
          </div>

          {filtered.map(inv => {
            const cfg = statusConfig[inv.status] ?? statusConfig.draft;
            const StatusIcon = cfg.icon;
            const isOverdue = inv.status !== "paid" && Boolean(inv.paymentDueDate && inv.paymentDueDate < now);

            return (
              <div key={inv.id}>
                {/* Desktop view row */}
                <div
                  className={`hidden sm:grid sm:grid-cols-[170px_1.5fr_1fr_1fr_110px_120px] gap-4 items-center px-4 py-3 bg-zinc-900 border rounded-xl transition-colors ${
                    isOverdue ? "border-rose-500/30 hover:border-rose-500/50" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {/* Status & Number */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium tracking-wide shrink-0 ${cfg.color}`}>
                      <StatusIcon className="size-2.5" />
                      {cfg.label}
                    </span>
                    <Link
                      href={`/cashflow/invoices/${inv.id}`}
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
                  <div className="flex items-center justify-end gap-1">
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
                      href={`/cashflow/invoices/new?edit=${inv.id}`}
                      title={t("Factuur bewerken")}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                    <Link
                      href={`/cashflow/invoices/${inv.id}`}
                      title="Bekijken & PDF"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Download className="size-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      disabled={deleting === inv.id}
                      title={t("Delete")}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile view card */}
                <div className={`sm:hidden p-4 bg-zinc-900 border rounded-xl space-y-3 ${isOverdue ? "border-rose-500/30" : "border-zinc-800"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${cfg.color}`}>
                        <StatusIcon className="size-2.5" />
                        {cfg.label}
                      </span>
                      <Link href={`/cashflow/invoices/${inv.id}`} className="text-xs font-mono font-bold text-white hover:text-blue-400">
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

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    {inv.status !== "paid" && (
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={markingPaid === inv.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-colors"
                      >
                        <Check className="size-3.5" /> {t("Markeer als betaald")}
                      </button>
                    )}
                    <Link href={`/cashflow/invoices/new?edit=${inv.id}`} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                      <Pencil className="size-3.5" />
                    </Link>
                    <Link href={`/cashflow/invoices/${inv.id}`} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10">
                      <Download className="size-3.5" />
                    </Link>
                    <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10">
                      <Trash2 className="size-3.5" />
                    </button>
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

