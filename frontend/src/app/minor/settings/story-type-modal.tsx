"use client";

import { Tag, X, Plus, CornerDownRight, CheckSquare } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStoryType } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";

interface StoryTypeModalProps {
  editingType: MinorStoryType | null;
  typeCode: string;
  setTypeCode: (v: string) => void;
  typeName: string;
  setTypeName: (v: string) => void;
  typeDesc: string;
  setTypeDesc: (v: string) => void;
  typeColor: string;
  setTypeColor: (v: string) => void;
  typeQualityCriteria: { text: string; indent: number }[];
  setTypeQualityCriteria: React.Dispatch<React.SetStateAction<{ text: string; indent: number }[]>>;
  typeFocusTarget: number | null;
  setTypeFocusTarget: (v: number | null) => void;
  savingType: boolean;
  addTypeQualityCriterion: (indent?: number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StoryTypeModal({
  editingType,
  typeCode,
  setTypeCode,
  typeName,
  setTypeName,
  typeDesc,
  setTypeDesc,
  typeColor,
  setTypeColor,
  typeQualityCriteria,
  setTypeQualityCriteria,
  typeFocusTarget,
  setTypeFocusTarget,
  savingType,
  addTypeQualityCriterion,
  onClose,
  onSubmit,
}: StoryTypeModalProps) {
  return (
  <ModalOverlay
    open
    onClose={() => onClose()}
    label={editingType ? t("Story Type bewerken") : t("Story Type toevoegen")}
    className="p-3 sm:p-4 overflow-y-auto"
  >
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Tag className="size-4 text-brand" />
          <span>{editingType ? t("Story Type bewerken") : t("Story Type toevoegen")}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            onClick={() => onClose()}
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
  </ModalOverlay>
  );
}
