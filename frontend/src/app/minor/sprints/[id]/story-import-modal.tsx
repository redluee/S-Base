"use client";

import { AlertTriangle, Download, Copy, X } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { useStoryImport } from "./use-story-import";

interface StoryImportModalProps {
  importer: ReturnType<typeof useStoryImport>;
}

export function StoryImportModal({ importer }: StoryImportModalProps) {
  const { setIsImportStoryModalOpen, importJsonText, setImportJsonText, importError, setImportError, isImportingStory, handlePasteClipboardToImport, handleImportStory } = importer;
  return (
    <ModalOverlay
      open
      onClose={() => setIsImportStoryModalOpen(false)}
      label={t("Story Importeren (JSON)")}
      className="p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="size-4 text-brand" />
            <span>{t("Story Importeren (JSON)")}</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsImportStoryModalOpen(false)}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          {t("Plak hieronder de JSON van een user story of importeer direct vanuit je klembord.")}
        </p>

        <form onSubmit={handleImportStory} className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 font-medium">{t("Story JSON")}</label>
              <button
                type="button"
                onClick={handlePasteClipboardToImport}
                className="text-brand hover:underline flex items-center gap-1 font-medium cursor-pointer text-xs"
              >
                <Copy className="size-3" />
                <span>{t("Plakken vanuit klembord")}</span>
              </button>
            </div>
            <textarea
              rows={10}
              value={importJsonText}
              onChange={(e) => {
                setImportJsonText(e.target.value);
                setImportError(null);
              }}
              placeholder={`{\n  "storyTypeCode": "US",\n  "storyNumber": "US 1.1",\n  "title": "Voorbeeld story",\n  "asA": "bezoeker",\n  "iWant": "...",\n  "soThat": "...",\n  "learningOutcomes": [1, 2],\n  "acceptanceCriteria": [\n    { "text": "Criterium 1", "isCompleted": false }\n  ]\n}`}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand"
            />
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsImportStoryModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              {t("Annuleren")}
            </button>
            <button
              type="submit"
              disabled={isImportingStory || !importJsonText.trim()}
              className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              <span>{isImportingStory ? t("Importeren...") : t("Importeren")}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
