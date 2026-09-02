"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Edit2, Tag, CornerDownRight, CheckSquare } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorVacation, type MinorStoryType } from "@/lib/api";
import { getStoryTypeDetails } from "@/components/minor-story-type-badge";

interface MinorSettingsClientProps {
  initialVacations: MinorVacation[];
  initialStoryTypes: MinorStoryType[];
}

export function MinorSettingsClient({ initialVacations, initialStoryTypes }: MinorSettingsClientProps) {
  const [vacations, setVacations] = useState<MinorVacation[]>(initialVacations);
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>(initialStoryTypes || []);

  // Vacation Modal
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<MinorVacation | null>(null);
  const [vacName, setVacName] = useState("");
  const [vacStart, setVacStart] = useState("");
  const [vacEnd, setVacEnd] = useState("");
  const [savingVac, setSavingVac] = useState(false);

  // Story Type Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<MinorStoryType | null>(null);
  const [typeCode, setTypeCode] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeColor, setTypeColor] = useState("#00e3a4");
  const [typeQualityCriteria, setTypeQualityCriteria] = useState<{ text: string; indent: number }[]>([]);
  const [typeFocusTarget, setTypeFocusTarget] = useState<number | null>(null);
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
    setEditingType(null);
    setTypeCode("");
    setTypeName("");
    setTypeDesc("");
    setTypeColor("#00e3a4");
    setTypeQualityCriteria([{ text: "", indent: 0 }]);
    setIsTypeModalOpen(true);
  }

  function openEditTypeModal(st: MinorStoryType) {
    setEditingType(st);
    setTypeCode(st.code);
    setTypeName(st.name);
    setTypeDesc(st.description || "");
    setTypeColor(st.color || "#00e3a4");
    setTypeQualityCriteria(
      st.defaultQualityCriteria && st.defaultQualityCriteria.length > 0
        ? st.defaultQualityCriteria.map((c) => ({ text: c.text, indent: c.indent || 0 }))
        : [{ text: "", indent: 0 }]
    );
    setIsTypeModalOpen(true);
  }

  function addTypeQualityCriterion(indent: number = 0) {
    setTypeQualityCriteria((prev) => {
      const next = [...prev, { text: "", indent }];
      setTypeFocusTarget(next.length - 1);
      return next;
    });
  }

  async function handleSaveStoryType(e: React.FormEvent) {
    e.preventDefault();
    if (!typeCode.trim() || !typeName.trim()) return;
    setSavingType(true);
    try {
      const filteredCriteria = typeQualityCriteria
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), indent: c.indent || 0 }));

      if (editingType) {
        await api.minor.storyTypes.update(editingType.id, {
          code: typeCode.trim().toUpperCase(),
          name: typeName.trim(),
          description: typeDesc.trim() || undefined,
          color: typeColor || undefined,
          defaultQualityCriteria: filteredCriteria,
        });
      } else {
        await api.minor.storyTypes.create({
          code: typeCode.trim().toUpperCase(),
          name: typeName.trim(),
          description: typeDesc.trim() || undefined,
          color: typeColor || undefined,
          defaultQualityCriteria: filteredCriteria,
        });
      }
      const updatedList = await api.minor.storyTypes.list();
      setStoryTypes(updatedList);
      setIsTypeModalOpen(false);
    } catch (err) {
      console.error("Failed to save story type:", err);
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
          {t("Configureer vakantieperiodes voor automatische sprintverlenging en beheer kwaliteitscriteria per story type.")}
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
              {t("Story Typen & Kwaliteitscriteria (US, RS, LS & Custom)")}
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
          {storyTypes.map((st) => {
            const criteriaCount = st.defaultQualityCriteria?.length || 0;
            const typeDetails = getStoryTypeDetails(st.code, storyTypes);
            return (
              <div
                key={st.id}
                onClick={() => openEditTypeModal(st)}
                style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
                className={`p-4 rounded-xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/40 flex flex-col justify-between gap-3 group cursor-pointer transition-all`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                        style={{
                          borderColor: `${typeDetails.color}40`,
                          backgroundColor: `${typeDetails.color}15`,
                          color: typeDetails.color,
                        }}
                      >
                        {st.code}
                      </span>
                      <span className={`text-xs font-bold text-white ${typeDetails.hoverTextClass} transition-colors`}>
                        {st.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditTypeModal(st)}
                        className={`text-zinc-400 ${typeDetails.hoverTextClass} p-1 rounded hover:bg-zinc-800 transition-all cursor-pointer`}
                        title={t("Story type en kwaliteitscriteria bewerken")}
                      >
                        <Edit2 className="size-3.5 transition-all group-hover:stroke-[2.75]" />
                      </button>
                      {!st.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStoryType(st.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                          title={t("Verwijderen")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {st.description && (
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{st.description}</p>
                  )}

                  {/* Quality criteria count & preview */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <CheckSquare className="size-3.5 text-brand" />
                        <span>{t("Standaard kwaliteitscriteria")}:</span>
                      </span>
                      <span className="font-mono font-semibold text-zinc-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                        {criteriaCount}
                      </span>
                    </div>
                    {criteriaCount > 0 && (
                      <ul className="text-[11px] text-zinc-400 space-y-1 pl-1">
                        {st.defaultQualityCriteria!.slice(0, 3).map((crit, cIdx) => (
                          <li key={cIdx} className="truncate flex items-center gap-1 text-zinc-300">
                            <span className="text-brand/70 font-mono text-[10px]">
                              {crit.indent ? "↳" : "•"}
                            </span>
                            <span className="truncate">{crit.text}</span>
                          </li>
                        ))}
                        {criteriaCount > 3 && (
                          <li className="text-[10px] text-zinc-500 italic pl-2">
                            +{criteriaCount - 3} {t("overige criteria")}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {st.isDefault && (
                  <span className="text-[10px] text-zinc-500 italic block">{t("Standaard type")}</span>
                )}
              </div>
            );
          })}
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

      {/* Story Type Modal (Create & Edit) */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="size-4 text-brand" />
                <span>{editingType ? t("Story Type bewerken") : t("Story Type toevoegen")}</span>
              </h2>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStoryType} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Type Code")}</label>
                  <input
                    type="text"
                    placeholder="bijv. TS of BUG"
                    maxLength={6}
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    disabled={Boolean(editingType && editingType.isDefault)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono uppercase focus:outline-none focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed"
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

              {/* Default Quality Criteria Editor */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-brand" />
                    <span className="font-bold text-white text-xs">{t("Standaard Kwaliteitscriteria")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 font-mono">
                      {typeQualityCriteria.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addTypeQualityCriterion(0)}
                      className="text-brand hover:underline flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>{t("Criterium")}</span>
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => addTypeQualityCriterion(1)}
                      className="text-brand/80 hover:text-brand hover:underline flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title={t("Subtaak toevoegen")}
                    >
                      <CornerDownRight className="size-3" />
                      <span>{t("Subtaak")}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {t("Deze kwaliteitscriteria worden automatisch klaargezet wanneer een gebruiker een story van dit type aanmaakt.")}
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto overflow-x-hidden pr-1">
                  {typeQualityCriteria.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2">{t("Geen standaard kwaliteitscriteria ingesteld.")}</p>
                  ) : (
                    typeQualityCriteria.map((c, idx) => {
                      const isSub = (c.indent ?? 0) > 0;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 ${
                            isSub ? "pl-4 border-l-2 border-brand/40 ml-1" : ""
                          }`}
                        >
                          <span className="text-zinc-500 font-mono text-[11px] w-4 shrink-0 text-center">
                            {isSub ? "↳" : `${idx + 1}.`}
                          </span>
                          <input
                            ref={(el) => {
                              if (typeFocusTarget === idx && el) {
                                el.focus();
                                setTypeFocusTarget(null);
                              }
                            }}
                            type="text"
                            value={c.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTypeQualityCriteria((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                              );
                            }}
                            placeholder={isSub ? "Sub-kwaliteitseis..." : "Kwaliteitseis omschrijving..."}
                            className="flex-1 min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand transition-colors placeholder-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setTypeQualityCriteria((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, indent: isSub ? 0 : 1 } : item))
                              );
                            }}
                            title={isSub ? t("Terugspringen naar hoofdtaak") : t("Inspringen als subtaak")}
                            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                              isSub
                                ? "text-brand bg-brand/10 hover:bg-brand/20"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            <CornerDownRight className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTypeQualityCriteria((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                            title={t("Verwijderen")}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
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
