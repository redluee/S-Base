"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Edit2, Tag } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorVacation, type MinorStoryType } from "@/lib/api";

interface MinorSettingsClientProps {
  initialVacations: MinorVacation[];
  initialStoryTypes: MinorStoryType[];
}

export function MinorSettingsClient({ initialVacations }: MinorSettingsClientProps) {
  const [vacations, setVacations] = useState<MinorVacation[]>(initialVacations);
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>([]);

  // Vacation Modal
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<MinorVacation | null>(null);
  const [vacName, setVacName] = useState("");
  const [vacStart, setVacStart] = useState("");
  const [vacEnd, setVacEnd] = useState("");
  const [savingVac, setSavingVac] = useState(false);

  // Story Type Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeCode, setTypeCode] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeColor, setTypeColor] = useState("#00e3a4");
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    api.minor.storyTypes.list().then(setStoryTypes).catch(() => {});
  }, []);

  // Vacation Handlers
  function openCreateVacModal() {
    setEditingVac(null);
    setVacName("");
    setVacStart("");
    setVacEnd("");
    setIsVacModalOpen(true);
  }

  function openEditVacModal(v: MinorVacation) {
    setEditingVac(v);
    setVacName(v.name);
    setVacStart(v.startDate);
    setVacEnd(v.endDate);
    setIsVacModalOpen(true);
  }

  async function handleSaveVacation(e: React.FormEvent) {
    e.preventDefault();
    if (!vacName.trim() || !vacStart || !vacEnd) return;
    setSavingVac(true);
    try {
      if (editingVac) {
        const updated = await api.minor.vacations.update(editingVac.id, {
          name: vacName.trim(),
          startDate: vacStart,
          endDate: vacEnd,
        });
        setVacations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await api.minor.vacations.create({
          name: vacName.trim(),
          startDate: vacStart,
          endDate: vacEnd,
        });
        setVacations((prev) => [...prev, created]);
      }
      setIsVacModalOpen(false);
    } catch (err) {
      console.error("Failed to save vacation:", err);
    } finally {
      setSavingVac(false);
    }
  }

  async function handleDeleteVacation(id: number) {
    if (!confirm(t("Weet je zeker dat je deze vakantieperiode wilt verwijderen?"))) return;
    try {
      await api.minor.vacations.delete(id);
      setVacations((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("Failed to delete vacation:", err);
    }
  }

  // Story Type Handlers
  function openCreateTypeModal() {
    setTypeCode("");
    setTypeName("");
    setTypeDesc("");
    setTypeColor("#00e3a4");
    setIsTypeModalOpen(true);
  }

  async function handleSaveStoryType(e: React.FormEvent) {
    e.preventDefault();
    if (!typeCode.trim() || !typeName.trim()) return;
    setSavingType(true);
    try {
      const created = await api.minor.storyTypes.create({
        code: typeCode.trim().toUpperCase(),
        name: typeName.trim(),
        description: typeDesc.trim() || undefined,
        color: typeColor || undefined,
      });
      setStoryTypes((prev) => [...prev, created]);
      setIsTypeModalOpen(false);
    } catch (err) {
      console.error("Failed to create story type:", err);
    } finally {
      setSavingType(false);
    }
  }

  async function handleDeleteStoryType(id: number) {
    if (!confirm(t("Weet je zeker dat je dit story type wilt verwijderen?"))) return;
    try {
      await api.minor.storyTypes.delete(id);
      setStoryTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete story type:", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
          {t("Minor Instellingen")}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {t("Configureer vakantieperiodes voor automatische sprintverlenging en beheer aangepaste story typen.")}
        </p>
      </div>

      {/* Vacation Management Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="size-5 text-brand" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t("Vakantiebeheer & Automatische Verlenging")}
            </h2>
          </div>
          <button
            onClick={openCreateVacModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{t("Vakantie toevoegen")}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-950/80 text-zinc-400 font-semibold">
                <th className="py-3 px-4">{t("Vakantienaam")}</th>
                <th className="py-3 px-4 w-36">{t("Startdatum")}</th>
                <th className="py-3 px-4 w-36">{t("Einddatum")}</th>
                <th className="py-3 px-4 w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vacations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 italic">
                    {t("Geen vakanties geregistreerd.")}
                  </td>
                </tr>
              ) : (
                vacations.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{v.name}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{v.startDate}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{v.endDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditVacModal(v)}
                          className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVacation(v.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Story Types Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="size-5 text-brand" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t("Story Typen (US, RS, LS & Custom)")}
            </h2>
          </div>
          <button
            onClick={openCreateTypeModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{t("Story Type toevoegen")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {storyTypes.map((st) => (
            <div
              key={st.id}
              className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                    style={{
                      borderColor: st.color ? `${st.color}40` : "rgba(255,255,255,0.1)",
                      backgroundColor: st.color ? `${st.color}15` : "rgba(255,255,255,0.05)",
                      color: st.color || "#00e3a4",
                    }}
                  >
                    {st.code}
                  </span>
                  <span className="text-xs font-bold text-white">{st.name}</span>
                </div>
                {st.description && (
                  <p className="text-[11px] text-zinc-400">{st.description}</p>
                )}
                {st.isDefault && (
                  <span className="text-[10px] text-zinc-500 italic block">{t("Standaard type")}</span>
                )}
              </div>

              {!st.isDefault && (
                <button
                  onClick={() => handleDeleteStoryType(st.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Vacation Modal */}
      {isVacModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="size-4 text-brand" />
                <span>{editingVac ? t("Vakantie bewerken") : t("Vakantie toevoegen")}</span>
              </h2>
              <button
                onClick={() => setIsVacModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVacation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">{t("Vakantienaam")}</label>
                <input
                  type="text"
                  placeholder="bijv. Herfstvakantie / Kerstvakantie"
                  value={vacName}
                  onChange={(e) => setVacName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Startdatum")}</label>
                  <input
                    type="date"
                    value={vacStart}
                    onChange={(e) => setVacStart(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Einddatum")}</label>
                  <input
                    type="date"
                    value={vacEnd}
                    onChange={(e) => setVacEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVacModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingVac}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingVac ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="size-4 text-brand" />
                <span>{t("Story Type toevoegen")}</span>
              </h2>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStoryType} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Type Code")}</label>
                  <input
                    type="text"
                    placeholder="bijv. TS of BUG"
                    maxLength={6}
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono uppercase focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Type Naam")}</label>
                  <input
                    type="text"
                    placeholder="bijv. Technical Story"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Omschrijving (optioneel)")}</label>
                <input
                  type="text"
                  placeholder="Korte beschrijving van wanneer dit type gebruikt wordt"
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Kleur")}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="size-8 rounded-lg bg-zinc-950 border border-white/10 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-zinc-400 text-xs">{typeColor}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingType}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingType ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
