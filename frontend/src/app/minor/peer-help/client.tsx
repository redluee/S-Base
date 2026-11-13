"use client";

import { toExternalHref } from "@/lib/uri";
import { useState } from "react";
import { Plus, Trash2, Edit2, ExternalLink, Search } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorPeerHelp, type MinorSprint } from "@/lib/api";
import { useActionError } from "@/lib/use-action-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PeerHelpModal } from "@/app/minor/peer-help-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface MinorPeerHelpClientProps {
  initialPeerHelp: MinorPeerHelp[];
  initialSprints: MinorSprint[];
}

export function MinorPeerHelpClient({ initialPeerHelp, initialSprints }: MinorPeerHelpClientProps) {
  const { error: actionError, report } = useActionError();
  const { confirm, dialog } = useConfirm();
  const [peerHelpList, setPeerHelpList] = useState<MinorPeerHelp[]>(initialPeerHelp);
  const [sprints] = useState<MinorSprint[]>(initialSprints);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MinorPeerHelp | null>(null);


  function openCreateModal() {
    setEditingEntry(null);
    setIsModalOpen(true);
  }

  function openEditModal(entry: MinorPeerHelp) {
    setEditingEntry(entry);
    setIsModalOpen(true);
  }

  function handleSaved(saved: MinorPeerHelp) {
    setPeerHelpList((prev) =>
      prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev],
    );
  }

  async function handleDelete(id: number) {
    if (!(await confirm(t("Weet je zeker dat je deze registratie wilt verwijderen?")))) return;
    try {
      await api.minor.peerHelp.delete(id);
      setPeerHelpList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      report(err, "minor.actionFailed");
    }
  }

  const filteredList = peerHelpList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.peerName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.links && item.links.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <InlineAlert>{actionError}</InlineAlert>
      {dialog}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            {t("Kennisdeling & Hulp")}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t("Registreer ondersteuning aan medestudenten en kennisdelingsactiviteiten (LU 5).")}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          title={t("Nieuwe hulp registratie")}
          aria-label={t("Nieuwe hulp registratie")}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t("Nieuwe hulp registratie")}</span>
          <span className="sm:hidden">{t("Nieuwe registratie")}</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder={t("Zoek op naam, omschrijving of link...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-brand"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
        <div className="block md:hidden divide-y divide-white/5">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 italic">
              {t("Geen kennisdeling geregistreerd.")}
            </div>
          ) : (
            filteredList.map((item) => {
              const linkedSprint = sprints.find((s) => s.id === item.sprintId);
              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-white text-sm truncate">{item.peerName}</span>
                      {linkedSprint && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5 shrink-0">
                          {linkedSprint.name}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-zinc-400 text-[11px] shrink-0">{item.date}</span>
                  </div>

                  <p className="text-zinc-300 leading-relaxed break-words">{item.description}</p>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    {item.links ? (
                      <a
                        href={toExternalHref(item.links)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-400 hover:underline text-xs truncate max-w-[200px]"
                      >
                        <ExternalLink className="size-3 shrink-0" />
                        <span className="truncate">{t("Link naar bewijs")}</span>
                      </a>
                    ) : (
                      <span className="text-zinc-500 text-[11px] italic">{t("Geen link")}</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-zinc-400 hover:text-white p-2 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("Bewerken")}
                        aria-label={t("Bewerken")}
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("Verwijderen")}
                        aria-label={t("Verwijderen")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-950/80 text-zinc-400 font-semibold">
                <th className="py-3 px-4 w-28">{t("Datum")}</th>
                <th className="py-3 px-4 w-44">{t("Naam medestudent")}</th>
                <th className="py-3 px-4">{t("Toelichting geboden hulp")}</th>
                <th className="py-3 px-4 w-36">{t("Sprint")}</th>
                <th className="py-3 px-4 w-44">{t("Links")}</th>
                <th className="py-3 px-4 w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 italic">
                    {t("Geen kennisdeling geregistreerd.")}
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const linkedSprint = sprints.find((s) => s.id === item.sprintId);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-400">{item.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{item.peerName}</td>
                      <td className="py-3.5 px-4 text-zinc-300 max-w-md break-words">{item.description}</td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {linkedSprint ? (
                          <span className="font-mono text-zinc-300">{linkedSprint.name}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.links ? (
                          <a
                            href={toExternalHref(item.links)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-400 hover:underline max-w-xs truncate"
                          >
                            <ExternalLink className="size-3 shrink-0" />
                            <span className="truncate">{item.links}</span>
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-zinc-400 hover:text-white p-1.5 rounded transition-colors cursor-pointer"
                            title={t("Bewerken")}
                            aria-label={t("Bewerken")}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                            title={t("Verwijderen")}
                            aria-label={t("Verwijderen")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <PeerHelpModal entry={editingEntry} sprints={sprints} onClose={() => setIsModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
