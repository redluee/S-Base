"use client";
import type { MinorStoryType } from "@/lib/api";

import { Trash2, CheckSquare, Square, Sparkles, Unlink, Copy, Check, X } from "lucide-react";
import { t } from "@/lib/lang";
import { getLUShortDesc } from "@/lib/minor-constants";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { useStoryEditor } from "./use-story-editor";
import type { useStoryLinking } from "./use-story-linking";

import { StoryEditCriteria } from "./story-edit-criteria";
import { StoryEditEvidence } from "./story-edit-evidence";

interface StoryEditModalProps {
  storyTypes: MinorStoryType[];
  editor: ReturnType<typeof useStoryEditor>;
  linking: ReturnType<typeof useStoryLinking>;
}

export function StoryEditModal({ storyTypes, editor, linking }: StoryEditModalProps) {
  const { setIsStoryModalOpen, editingStory, storyTypeCode, setStoryTypeCode, storyNumber, setStoryNumber, storyTitle, setStoryTitle, asA, setAsA, iWant, setIWant, soThat, setSoThat, selectedLUs, setSelectedLUs, storyStatus, setStoryStatus, qualityCriteria, setQualityCriteria, savingStory, copiedExport, getDefaultQualityCriteriaForType, handleSaveStory, handleDeleteStory, handleExportStoryJson } = editor;
  const { openUnlinkStoryModal } = linking;
  return (
    <ModalOverlay
      open
      onClose={() => setIsStoryModalOpen(false)}
      label={editingStory ? t("Story Bewerken") : t("Nieuwe Story Aanmaken")}
      className="p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-7 max-w-3xl w-full space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="size-4.5 text-brand" />
            <span>{editingStory ? t("Story Bewerken") : t("Nieuwe Story Aanmaken")}</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsStoryModalOpen(false)}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSaveStory} className="space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Story Type")}</label>
              <select
                value={storyTypeCode}
                onChange={(e) => {
                  const newCode = e.target.value;
                  const oldCode = storyTypeCode;
                  setStoryTypeCode(newCode);

                  if (!editingStory) {
                    if (storyNumber.startsWith(oldCode)) {
                      setStoryNumber(storyNumber.replace(oldCode, newCode));
                    }

                    const prevDefaults = getDefaultQualityCriteriaForType(oldCode);
                    const isUntouchedOrEmpty =
                      qualityCriteria.length === 0 ||
                      (qualityCriteria.length === 1 && !qualityCriteria[0].text.trim()) ||
                      JSON.stringify(qualityCriteria.map((c) => ({ text: c.text.trim(), indent: c.indent || 0 }))) ===
                        JSON.stringify(prevDefaults.map((c) => ({ text: c.text.trim(), indent: c.indent || 0 })));

                    if (isUntouchedOrEmpty) {
                      setQualityCriteria(getDefaultQualityCriteriaForType(newCode));
                    }
                  }
                }}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="US">{t("US - User Story")}</option>
                <option value="RS">{t("RS - Research Story")}</option>
                <option value="LS">{t("LS - Learning Story")}</option>
                {storyTypes
                  .filter((t) => !["US", "RS", "LS"].includes(t.code))
                  .map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Story nummer")}</label>
              <input
                type="text"
                placeholder="bijv. US 1.1"
                value={storyNumber}
                onChange={(e) => setStoryNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Titel")}</label>
              <input
                type="text"
                placeholder="Korte omschrijving"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                required
              />
            </div>
          </div>

          {/* Template fields: Als / Wil ik / Zodat */}
          <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm">
              <Sparkles className="size-4 text-brand" />
              <span>{t("User Story Template")}</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Als [rol]")}</label>
                <input
                  type="text"
                  placeholder="bijv. beheerder, gebruiker..."
                  value={asA}
                  onChange={(e) => setAsA(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Wil ik [wens]")}</label>
                <input
                  type="text"
                  placeholder="bijv. kunnen inloggen met wachtwoord..."
                  value={iWant}
                  onChange={(e) => setIWant(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Zodat [doel]")}</label>
                <input
                  type="text"
                  placeholder="bijv. alleen geautoriseerde personen toegang hebben..."
                  value={soThat}
                  onChange={(e) => setSoThat(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Learning Outcomes multi-select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              {t("Gekoppelde Leeruitkomsten (1 t/m 5)")}
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((lu) => {
                const isChecked = selectedLUs.includes(lu);
                return (
                  <button
                    key={lu}
                    type="button"
                    onClick={() => {
                      setSelectedLUs((prev) =>
                        isChecked ? prev.filter((x) => x !== lu) : [...prev, lu].sort((a, b) => a - b)
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isChecked
                        ? "bg-brand/15 border-brand/40 text-brand"
                        : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isChecked ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0" />}
                    <span>
                      <span className="font-mono font-bold">LU {lu}</span>
                      {getLUShortDesc(lu) && (
                        <span className={isChecked ? "text-brand/90 font-medium ml-1" : "text-zinc-400 font-normal ml-1"}>
                          · {getLUShortDesc(lu)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Status")}</label>
            <select
              value={storyStatus}
              onChange={(e) => setStoryStatus(e.target.value as "todo" | "in_progress" | "done")}
              className="w-full sm:w-56 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand cursor-pointer"
            >
              <option value="todo">{t("To Do")}</option>
              <option value="in_progress">{t("Bezig")}</option>
              <option value="done">{t("Voltooid")}</option>
            </select>
          </div>

          {/* Criteria Checklists Stacked (Acceptance & Quality) */}
          <StoryEditCriteria editor={editor} />

          {/* Evidence Links & Document Uploads */}
          <StoryEditEvidence editor={editor} />

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              {editingStory && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(editingStory.id)}
                    className="flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={t("Verwijderen")}
                    aria-label={t("Verwijderen")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stToUnlink = editingStory;
                      setIsStoryModalOpen(false);
                      openUnlinkStoryModal(stToUnlink);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors text-xs sm:text-sm font-medium cursor-pointer"
                    title={t("Ontkoppel of verplaats story")}
                  >
                    <Unlink className="size-4" />
                    <span>{t("Loskoppelen")}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleExportStoryJson}
                className="flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={t("Exporteer story als JSON naar klembord")}
                aria-label={t("Exporteer story als JSON naar klembord")}
              >
                {copiedExport ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStoryModalOpen(false)}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
              >
                {t("Annuleren")}
              </button>
              <button
                type="submit"
                disabled={savingStory}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Check className="size-4" />
                <span>{savingStory ? t("Opslaan...") : editingStory ? t("Opslaan") : t("Story Aanmaken")}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
