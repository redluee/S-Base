"use client";

import { useState } from "react";
import {
  Presentation,
  Plus,
  Trash2,
  Upload,
  Globe,
  Image as ImageIcon,
  Check,
  X,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorStory, type MinorStoryPresentationData } from "@/lib/api";

interface PresentationStoryEditorProps {
  story: MinorStory;
  onSave: (updatedData: MinorStoryPresentationData) => Promise<void>;
  onClose: () => void;
}

export function PresentationStoryEditor({ story, onSave, onClose }: PresentationStoryEditorProps) {
  const initialData = story.presentationData || {};

  const [enabled, setEnabled] = useState<boolean>(initialData.enabled !== false);
  const [layout, setLayout] = useState<"auto" | "split" | "media" | "bullets" | "demo">(
    initialData.layout || "auto"
  );
  const [summary, setSummary] = useState<string>(initialData.summary || "");
  const [demoUrl, setDemoUrl] = useState<string>(initialData.demoUrl || "");
  const [demoTitle, setDemoTitle] = useState<string>(initialData.demoTitle || "");
  const [bullets, setBullets] = useState<string[]>(
    initialData.bullets && initialData.bullets.length > 0 ? initialData.bullets : [""]
  );
  const [listStyle, setListStyle] = useState<"bullets" | "steps">(
    initialData.listStyle || "bullets"
  );
  const [images, setImages] = useState<Array<{ url: string; caption?: string }>>(
    initialData.images || []
  );
  const [notes, setNotes] = useState<string>(initialData.notes || "");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function handleFileUpload(file: File) {
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
      const payload: MinorStoryPresentationData = {
        enabled,
        layout,
        listStyle,
        summary: summary.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        demoTitle: demoTitle.trim() || undefined,
        bullets: bullets.map((b) => b.trim()).filter(Boolean),
        images: images.filter((img) => img.url.trim().length > 0),
        notes: notes.trim() || undefined,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Failed to save presentation data:", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-2xl w-full space-y-5 shadow-2xl my-8 text-sm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Presentation className="size-4.5 text-brand" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {t("Show & Tell Presentatie Content")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs text-zinc-400">
          <span className="text-zinc-200 font-bold">{story.storyNumber || "Story"}:</span> {story.title}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Include in presentation & Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-brand focus:ring-brand size-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-zinc-200">
                {t("Opnemen in presentatie")}
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {t("Dia layout")}
              </label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as "auto" | "split" | "media" | "bullets" | "demo")}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="auto">{t("Automatisch (aanbevolen)")}</option>
                <option value="split">{t("Split (Tekst & Media)")}</option>
                <option value="media">{t("Media Galerij")}</option>
                <option value="demo">{t("Live Demo Focus")}</option>
                <option value="bullets">{t("Highlights & Doelen")}</option>
              </select>
            </div>
          </div>

          {/* Custom Summary / Subtitle */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {t("Aangepaste toelichting / samenvatting (optioneel)")}
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Korte samenvatting van wat er gebouwd is..."
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
            />
          </div>

          {/* Highlights / Bullet points */}
          <div className="space-y-3 p-4 rounded-xl bg-zinc-950 border border-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-zinc-200">
                {t("Highlights / Opsomming")}
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setListStyle("bullets")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      listStyle === "bullets"
                        ? "bg-zinc-800 text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t("Bulletpoints (•)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setListStyle("steps")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      listStyle === "steps"
                        ? "bg-zinc-800 text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t("Stappen (1, 2, 3)")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setBullets((prev) => [...prev, ""])}
                  className="text-brand hover:underline flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>{t("Toevoegen")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {bullets.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs w-4 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={b}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBullets((prev) => prev.map((item, i) => (i === idx ? val : item)));
                    }}
                    placeholder="bijv. API endpoints geïmplementeerd met Drizzle ORM..."
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                  />
                  {bullets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBullets((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Demo URL */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Globe className="size-3.5 text-brand" />
              <span>{t("Live Deployed Product URL")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={demoTitle}
                onChange={(e) => setDemoTitle(e.target.value)}
                placeholder="Knop label (bijv. Bekijk Live Applicatie)"
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
              />
              <input
                type="text"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://jouw-app.example.com"
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Screenshots & Images */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ImageIcon className="size-3.5 text-brand" />
                <span>{t("Screenshots & Afbeeldingen")}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-brand hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="size-3.5" />
                  <span>{uploadingImage ? t("Uploaden...") : t("Uploaden")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setImages((prev) => [...prev, { url: "", caption: "" }])}
                  className="text-brand hover:underline flex items-center gap-1 text-xs cursor-pointer font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>{t("URL")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={img.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImages((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                      );
                    }}
                    placeholder="/api/uploads/... of https://..."
                    className="sm:col-span-6 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                  />
                  <input
                    type="text"
                    value={img.caption || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImages((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, caption: val } : item))
                      );
                    }}
                    placeholder="Onderschrift (optioneel)"
                    className="sm:col-span-5 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="sm:col-span-1 p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer flex justify-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {images.length === 0 && (
                <p className="text-zinc-500 italic text-xs py-1">
                  {t("Geen screenshots toegevoegd.")}
                </p>
              )}
            </div>
          </div>

          {/* Presenter Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {t("Presentator notities (alleen zichtbaar tijdens voorbereiding of spiekmodus)")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Belangrijke punten om te noemen tijdens de show & tell..."
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
