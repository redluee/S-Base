"use client";

import { useState } from "react";
import { Users, Plus, Trash2, Edit2, ExternalLink, Search } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorPeerHelp, type MinorSprint } from "@/lib/api";

interface MinorPeerHelpClientProps {
  initialPeerHelp: MinorPeerHelp[];
  initialSprints: MinorSprint[];
}

export function MinorPeerHelpClient({ initialPeerHelp, initialSprints }: MinorPeerHelpClientProps) {
  const [peerHelpList, setPeerHelpList] = useState<MinorPeerHelp[]>(initialPeerHelp);
  const [sprints] = useState<MinorSprint[]>(initialSprints);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MinorPeerHelp | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sprintId, setSprintId] = useState<number | undefined>(undefined);
  const [peerName, setPeerName] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState("");
  const [saving, setSaving] = useState(false);

  function openCreateModal() {
    setEditingEntry(null);
    setDate(new Date().toISOString().slice(0, 10));
    setSprintId(undefined);
    setPeerName("");
    setDescription("");
    setLinks("");
    setIsModalOpen(true);
  }

  function openEditModal(entry: MinorPeerHelp) {
    setEditingEntry(entry);
    setDate(entry.date);
    setSprintId(entry.sprintId ?? undefined);
    setPeerName(entry.peerName);
    setDescription(entry.description);
    setLinks(entry.links || "");
    setIsModalOpen(true);
  }

  async function handleSavePeerHelp(e: React.FormEvent) {
    e.preventDefault();
    if (!peerName.trim() || !description.trim()) return;
    setSaving(true);
    try {
      if (editingEntry) {
        const updated = await api.minor.peerHelp.update(editingEntry.id, {
          date,
          sprintId: sprintId ?? null,
          peerName: peerName.trim(),
          description: description.trim(),
          links: links.trim() || undefined,
        });
        setPeerHelpList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await api.minor.peerHelp.create({
          date,
          sprintId: sprintId ?? null,
          peerName: peerName.trim(),
          description: description.trim(),
          links: links.trim() || undefined,
        });
        setPeerHelpList((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save peer help:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("Weet je zeker dat je deze registratie wilt verwijderen?"))) return;
    try {
      await api.minor.peerHelp.delete(id);
      setPeerHelpList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete peer help:", err);
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
      {/* Header */}
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>{t("Nieuwe hulp registratie")}</span>
        </button>
      </div>

      {/* Search Bar */}
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

      {/* Table / Cards List */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
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
                    <td className="py-3.5 px-4 text-zinc-300 max-w-md">{item.description}</td>
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
                          href={item.links}
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
                          className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="size-4 text-purple-400" />
                <span>{editingEntry ? t("Kennisdeling Bewerken") : t("Kennisdeling Registreren")}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeerHelp} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Datum")}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Gekoppelde sprint (optioneel)")}</label>
                  <select
                    value={sprintId ?? ""}
                    onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="">{t("Geen sprint")}</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startDate})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Naam medestudent")}</label>
                <input
                  type="text"
                  placeholder="bijv. Lisa van Dijk"
                  value={peerName}
                  onChange={(e) => setPeerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Toelichting geboden hulp")}</label>
                <textarea
                  rows={3}
                  placeholder="Wat heb je uitgelegd, gereviewed of opgelost?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Links naar documentatie/code (optioneel)")}</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
