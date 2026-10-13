"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Presentation, Check, X } from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorStory,
  type MinorStoryPresentationData,
  type MinorStoryPresentationDocument,
  type MinorStoryPresentationLink,
} from "@/lib/api";
import {
  buildInitialDocuments,
  buildInitialImages,
  buildInitialWebsites,
  buildPresentationPayload,
  hasPresentationChanges,
  type EditorBlockKey,
  type PresentationImage,
  type PresentationLayout,
  type PresentationListStyle,
} from "./presentation-editor-utils";
import { BulletsBlock, DocumentsBlock, ImagesBlock, WebsitesBlock } from "./presentation-editor-blocks";

interface PresentationStoryEditorProps {
  story: MinorStory;
  onSave: (updatedData: MinorStoryPresentationData) => Promise<void>;
  onClose: () => void;
}

export function PresentationStoryEditor({ story, onSave, onClose }: PresentationStoryEditorProps) {
  const initialData = useMemo(() => story.presentationData || {}, [story.presentationData]);

  const [enabled, setEnabled] = useState<boolean>(initialData.enabled !== false);
  const [layout, setLayout] = useState<PresentationLayout>(
    initialData.layout || "auto"
  );
  const [bullets, setBullets] = useState<string[]>(
    initialData.bullets && initialData.bullets.length > 0 ? initialData.bullets : [""]
  );
  const [listStyle, setListStyle] = useState<PresentationListStyle>(
    initialData.listStyle || "bullets"
  );
  const [websites, setWebsites] = useState<MinorStoryPresentationLink[]>(() =>
    buildInitialWebsites(initialData)
  );
  const [documents, setDocuments] = useState<MinorStoryPresentationDocument[]>(() =>
    buildInitialDocuments(initialData)
  );
  const [images, setImages] = useState<PresentationImage[]>(() => buildInitialImages(initialData));

  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [expandedBlocks, setExpandedBlocks] = useState<Record<EditorBlockKey, boolean>>(() => {
    const hasBullets = Boolean(
      initialData.bullets && initialData.bullets.some((b) => b.trim().length > 0)
    );
    const hasWebsites = websites.length > 0;
    const hasDocs = documents.length > 0;
    const hasImgs = images.length > 0;

    return {
      bullets: hasBullets,
      websites: hasWebsites,
      documents: hasDocs,
      images: hasImgs,
    };
  });

  function toggleBlock(key: EditorBlockKey) {
    setExpandedBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handlePdfUpload(file: File) {
    setUploadingPdf(true);
    try {
      const res = await api.minor.upload(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      setDocuments((prev) => [
        ...prev,
        {
          title: cleanTitle,
          url: res.filePath,
        },
      ]);
      setExpandedBlocks((prev) => ({ ...prev, documents: true }));
    } catch (err) {
      console.error("PDF upload failed:", err);
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const res = await api.minor.upload(file);
      setImages((prev) => [
        ...prev,
        {
          url: res.filePath,
          caption: file.name.replace(/\.[^/.]+$/, ""),
        },
      ]);
      setExpandedBlocks((prev) => ({ ...prev, images: true }));
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(
        buildPresentationPayload({ enabled, layout, listStyle, bullets, websites, documents, images })
      );
      onClose();
    } catch (err) {
      console.error("Failed to save presentation data:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const hasUnsavedChanges = useCallback(
    (): boolean =>
      hasPresentationChanges(initialData, {
        enabled, layout, listStyle, bullets, websites, documents, images,
      }),
    [initialData, enabled, layout, listStyle, bullets, websites, documents, images]
  );

  const handleSafeClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      if (!confirm(t("Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?"))) {
        return;
      }
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSafeClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSafeClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-2xl w-full space-y-5 shadow-2xl my-8 text-sm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and On/Off Switch next to close button */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Presentation className="size-4.5 text-brand shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              {t("Show & Tell Presentatie Content")}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium hidden sm:inline select-none">
                {enabled ? t("In presentatie") : t("Uitgeschakeld")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  enabled ? "bg-brand" : "bg-zinc-800"
                }`}
                title={enabled ? t("Dia ingeschakeld in presentatie") : t("Dia uitgeschakeld")}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-zinc-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="w-px h-5 bg-white/10" />

            <button
              type="button"
              onClick={handleSafeClose}
              className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
              title={t("Sluiten")}
              aria-label={t("Sluiten")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs text-zinc-400">
          <span className="text-zinc-200 font-bold">{story.storyNumber || "Story"}:</span> {story.title}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dia Layout Keuze */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-zinc-200">
                {t("Dia layout")}
              </label>
              <p className="text-[11px] text-zinc-500">
                {t("Bepaalt de visuele verdeling van de inhoud op de dia")}
              </p>
            </div>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as "auto" | "split" | "media" | "bullets" | "demo")}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand cursor-pointer shrink-0"
            >
              <option value="auto">{t("Automatisch (aanbevolen)")}</option>
              <option value="split">{t("Split (Tekst & Media)")}</option>
              <option value="media">{t("Media Galerij")}</option>
              <option value="bullets">{t("Punten Focus")}</option>
              <option value="demo">{t("Live Demo Focus")}</option>
            </select>
          </div>

          {/* Blok 1: Bulletpoints of genummerde punten */}
          <BulletsBlock
            expanded={expandedBlocks.bullets}
            onToggle={() => toggleBlock("bullets")}
            bullets={bullets}
            setBullets={setBullets}
            listStyle={listStyle}
            setListStyle={setListStyle}
          />

          <WebsitesBlock
            expanded={expandedBlocks.websites}
            onToggle={() => toggleBlock("websites")}
            websites={websites}
            setWebsites={setWebsites}
            onExpand={() => setExpandedBlocks((prev) => ({ ...prev, websites: true }))}
          />

          <DocumentsBlock
            expanded={expandedBlocks.documents}
            onToggle={() => toggleBlock("documents")}
            documents={documents}
            setDocuments={setDocuments}
            uploadingPdf={uploadingPdf}
            onPdfUpload={handlePdfUpload}
          />

          <ImagesBlock
            expanded={expandedBlocks.images}
            onToggle={() => toggleBlock("images")}
            images={images}
            setImages={setImages}
            uploadingImage={uploadingImage}
            onImageUpload={handleImageUpload}
          />


          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              {t("Annuleren")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="size-3.5" />
              <span>{isSaving ? t("Opslaan...") : t("Opslaan")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}