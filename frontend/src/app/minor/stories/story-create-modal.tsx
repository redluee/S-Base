"use client";

import { Sparkles, Plus, Check, X } from "lucide-react";
import { t } from "@/lib/lang";
import { getLUShortDesc } from "@/lib/minor-constants";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { MinorSprint, MinorStoryType } from "@/lib/api";

interface StoryCreateModalProps {
  storyTypes: MinorStoryType[];
  sprints: MinorSprint[];
  getDefaultQualityCriteriaForType: (code: string) => { text: string; isCompleted: boolean; indent?: number }[];
  newSprintId: string;
  setNewSprintId: React.Dispatch<React.SetStateAction<string>>;
  newStoryTypeCode: string;
  setNewStoryTypeCode: React.Dispatch<React.SetStateAction<string>>;
  newStoryNumber: string;
  setNewStoryNumber: React.Dispatch<React.SetStateAction<string>>;
  newStoryTitle: string;
  setNewStoryTitle: React.Dispatch<React.SetStateAction<string>>;
  newAsA: string;
  setNewAsA: React.Dispatch<React.SetStateAction<string>>;
  newIWant: string;
  setNewIWant: React.Dispatch<React.SetStateAction<string>>;
  newSoThat: string;
  setNewSoThat: React.Dispatch<React.SetStateAction<string>>;
  newSelectedLUs: number[];
  setNewSelectedLUs: React.Dispatch<React.SetStateAction<number[]>>;
  newStatus: "todo" | "in_progress" | "done";
  setNewStatus: React.Dispatch<React.SetStateAction<"todo" | "in_progress" | "done">>;
  newAcceptanceCriteria: { text: string; isCompleted: boolean; indent?: number }[];
  setNewAcceptanceCriteria: React.Dispatch<React.SetStateAction<{ text: string; isCompleted: boolean; indent?: number }[]>>;
  setNewQualityCriteria: React.Dispatch<React.SetStateAction<{ text: string; isCompleted: boolean; indent?: number }[]>>;
  savingNewStory: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StoryCreateModal({ storyTypes, sprints, getDefaultQualityCriteriaForType, newSprintId, setNewSprintId, newStoryTypeCode, setNewStoryTypeCode, newStoryNumber, setNewStoryNumber, newStoryTitle, setNewStoryTitle, newAsA, setNewAsA, newIWant, setNewIWant, newSoThat, setNewSoThat, newSelectedLUs, setNewSelectedLUs, newStatus, setNewStatus, newAcceptanceCriteria, setNewAcceptanceCriteria, setNewQualityCriteria, savingNewStory, onClose, onSubmit }: StoryCreateModalProps) {
  return (
      <ModalOverlay
        open
        onClose={() => onClose()}
        label={t("Nieuwe Story Aanmaken")}
        className="p-3 sm:p-4 overflow-y-auto"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-7 max-w-3xl w-full space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Plus className="size-4 text-brand" />
              <span>{t("Nieuwe Story Aanmaken")}</span>
            </h2>
            <button
              type="button"
              onClick={() => onClose()}
              className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
              title={t("Sluiten")}
              aria-label={t("Sluiten")}
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            {/* Type, Number, Sprint Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">{t("Story Type")}</label>
                <select
                  value={newStoryTypeCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setNewStoryTypeCode(code);
                    setNewQualityCriteria(getDefaultQualityCriteriaForType(code));
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand"
                >
                  <option value="US">US - User Story</option>
                  <option value="RS">RS - Research Story</option>
                  <option value="LS">LS - Learning Story</option>
                  {storyTypes
                    .filter((t) => !["US", "RS", "LS"].includes(t.code.toUpperCase()))
                    .map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.code} - {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">{t("Story Nummer (optioneel)")}</label>
                <input
                  type="text"
                  value={newStoryNumber}
                  onChange={(e) => setNewStoryNumber(e.target.value)}
                  placeholder="US 1.1"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">{t("Sprint Koppeling")}</label>
                <select
                  value={newSprintId}
                  onChange={(e) => setNewSprintId(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="">{t("Geen sprint (Concept / Backlog)")}</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={String(sp.id)}>
                      {sp.sprintNumber}: {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-zinc-400 font-medium">{t("Titel van de story")} *</label>
              <input
                type="text"
                required
                value={newStoryTitle}
                onChange={(e) => setNewStoryTitle(e.target.value)}
                placeholder={t("bv. Recepten filteren op bereidingstijd")}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-brand"
              />
            </div>

            {/* Als / Wil ik / Zodat */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-3">
              <div className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-brand" />
                <span>{t("User Story Template")}</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newAsA}
                  onChange={(e) => setNewAsA(e.target.value)}
                  placeholder={t("Als [rol/gebruiker], bv. thuiskok")}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                />
                <input
                  type="text"
                  value={newIWant}
                  onChange={(e) => setNewIWant(e.target.value)}
                  placeholder={t("wil ik [wens/functionaliteit], bv. recepten kunnen sorteren op kooktijd")}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                />
                <input
                  type="text"
                  value={newSoThat}
                  onChange={(e) => setNewSoThat(e.target.value)}
                  placeholder={t("zodat [doel/waarde], bv. ik snel een recept kan vinden dat past bij mijn beschikbare tijd")}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Learning Outcomes */}
            <div className="space-y-1">
              <label className="text-zinc-400 font-medium block">{t("Leeruitkomsten (LU)")}</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((lu) => {
                  const selected = newSelectedLUs.includes(lu);
                  return (
                    <button
                      key={lu}
                      type="button"
                      onClick={() => {
                        setNewSelectedLUs((prev) =>
                          prev.includes(lu) ? prev.filter((x) => x !== lu) : [...prev, lu]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                        selected
                          ? "bg-brand/20 border-brand/40 text-brand"
                          : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="font-mono font-bold">LU {lu}</span>
                      {getLUShortDesc(lu) && (
                        <span className={selected ? "text-brand/90 font-medium" : "text-zinc-400 font-normal"}>
                          · {getLUShortDesc(lu)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-zinc-400 font-medium">{t("Status")}</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as "todo" | "in_progress" | "done")}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand"
              >
                <option value="todo">{t("To Do")}</option>
                <option value="in_progress">{t("Bezig")}</option>
                <option value="done">{t("Voltooid")}</option>
              </select>
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-400 font-medium">{t("Acceptatiecriteria")}</label>
                <button
                  type="button"
                  onClick={() => setNewAcceptanceCriteria((prev) => [...prev, { text: "", isCompleted: false, indent: 0 }])}
                  className="text-xs text-brand hover:underline cursor-pointer"
                >
                  + {t("Criterium toevoegen")}
                </button>
              </div>
              {newAcceptanceCriteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAcceptanceCriteria((prev) => prev.map((item, idx) => (idx === i ? { ...item, text: val } : item)));
                    }}
                    placeholder={t("bv. Er is een sorteerknop beschikbaar op de receptenpagina")}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setNewAcceptanceCriteria((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-zinc-500 hover:text-red-400 p-1.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                {t("Annuleren")}
              </button>
              <button
                type="submit"
                disabled={savingNewStory || !newStoryTitle.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Check className="size-4" />
                <span>{savingNewStory ? t("Aanmaken...") : t("Story Aanmaken")}</span>
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
  );
}
