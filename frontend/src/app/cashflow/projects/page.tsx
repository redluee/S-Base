"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowProject, CashflowClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Pencil, Trash2, FileText, Euro, AlertTriangle, X } from "lucide-react";

function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<CashflowProject[]>([]);
  const [clients, setClients] = useState<CashflowClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  // Modal state for project deletion with connected invoices option
  const [deleteModalProject, setDeleteModalProject] = useState<CashflowProject | null>(null);
  const [deleteInvoicesChoice, setDeleteInvoicesChoice] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.cashflow.projects.list(), api.cashflow.clients.list()]).then(([p, c]) => {
      if (active) { setProjects(p); setClients(c); }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function promptDelete(project: CashflowProject) {
    setDeleteInvoicesChoice(false);
    setDeleteModalProject(project);
  }

  async function confirmDelete() {
    if (!deleteModalProject) return;
    const projId = deleteModalProject.id;
    setDeleting(projId);
    try {
      await api.cashflow.projects.delete(projId, deleteInvoicesChoice);
      setProjects(prev => prev.filter(p => p.id !== projId));
      setDeleteModalProject(null);
    } catch {} finally {
      setDeleting(null);
    }
  }

  const filtered = projects.filter(p => {
    if (filterClient && p.clientId !== Number(filterClient)) return false;
    return true;
  });

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FolderOpen className="size-5 text-blue-400" />{t("Projecten")}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{filtered.length} project{filtered.length !== 1 ? "en" : ""}</p>
        </div>
        <Link href="/cashflow/projects/new">
          <Button className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
            <Plus className="size-3.5 mr-1" />{t("Nieuw project")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="text-xs leading-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">{t("Alle")} klanten</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FolderOpen className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen projecten gevonden.")}</p>
          <Link href="/cashflow/projects/new" className="mt-3 text-xs text-blue-400 hover:text-blue-300 inline-block">{t("Maak je eerste project aan")}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="flex items-start justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white truncate">{p.name}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs text-zinc-400">{p.clientName}</span>
                  {p.tradeNameDisplay && <span className="text-xs text-zinc-500">{p.tradeNameDisplay}</span>}
                  {p.location && <span className="text-xs text-zinc-500">{p.location}</span>}
                </div>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <FileText className="size-3" />{p.invoiceCount} facturen
                  </span>
                  {p.totalBilled > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-400">
                      <Euro className="size-3" />{formatEuro(p.totalBilled)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-3">
                <Link href={`/cashflow/invoices?projectId=${p.id}`} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <FileText className="size-3.5" />
                </Link>
                <Link href={`/cashflow/projects/new?edit=${p.id}`} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <Pencil className="size-3.5" />
                </Link>
                <button onClick={() => promptDelete(p)} disabled={deleting === p.id} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Project Modal */}
      {deleteModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{t("Project verwijderen")}</h3>
                  <p className="text-xs text-zinc-400">{deleteModalProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalProject(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="size-4" />
              </button>
            </div>

            {deleteModalProject.invoiceCount > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300">
                  {t("Dit project bevat")} <span className="font-semibold text-white">{deleteModalProject.invoiceCount} {t("gekoppelde factuur/facturen")}</span>. {t("Wat wilt u met deze facturen doen?")}
                </p>

                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!deleteInvoicesChoice ? "bg-zinc-800/80 border-blue-500/50" : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"}`}>
                    <input
                      type="radio"
                      name="deleteInvoicesChoice"
                      checked={!deleteInvoicesChoice}
                      onChange={() => setDeleteInvoicesChoice(false)}
                      className="mt-0.5 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-white block">{t("Facturen bewaren (aan aan klant gekoppeld houden)")}</span>
                      <span className="text-[11px] text-zinc-400 block">{t("De facturen blijven gekoppeld aan")} <span className="text-zinc-300 font-medium">{deleteModalProject.clientName}</span>, {t("maar de koppeling met dit project verdwijnt.")}</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteInvoicesChoice ? "bg-rose-500/10 border-rose-500/50" : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"}`}>
                    <input
                      type="radio"
                      name="deleteInvoicesChoice"
                      checked={deleteInvoicesChoice}
                      onChange={() => setDeleteInvoicesChoice(true)}
                      className="mt-0.5 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-rose-400 block">{t("Gekoppelde facturen ook verwijderen")}</span>
                      <span className="text-[11px] text-zinc-400 block">{t("Verwijder het project én alle")} {deleteModalProject.invoiceCount} {t("gekoppelde facturen definitief.")}</span>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-300">
                {t("Weet u zeker dat u dit project wilt verwijderen?")}
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                onClick={() => setDeleteModalProject(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5"
              >
                {t("Annuleer")}
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                disabled={deleting === deleteModalProject.id}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5"
              >
                {deleting === deleteModalProject.id ? t("Verwijderen...") : t("Project verwijderen")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

