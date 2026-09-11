"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Presentation,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  ChevronDown,
  ListChecks,
  SquareArrowOutUpRight,
  Globe,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorStory,
  type MinorStoryPresentationData,
  type MinorStoryPresentationDocument,
  type MinorStoryPresentationLink,
} from "@/lib/api";
import { isImageUrl } from "@/lib/minor-constants";

interface PresentationStoryEditorProps {
  story: MinorStory;
  onSave: (updatedData: MinorStoryPresentationData) => Promise<void>;
  onClose: () => void;
}

export function PresentationStoryEditor({ story, onSave, onClose }: PresentationStoryEditorProps) {
  const initialData = useMemo(() => story.presentationData || {}, [story.presentationData]);

  const [enabled, setEnabled] = useState<boolean>(initialData.enabled !== false);
  const [layout, setLayout] = useState<"auto" | "split" | "media" | "bullets" | "demo">(
    initialData.layout || "auto"
  );
  const [bullets, setBullets] = useState<string[]>(
    initialData.bullets && initialData.bullets.length > 0 ? initialData.bullets : [""]
  );
  const [listStyle, setListStyle] = useState<"bullets" | "steps">(
    initialData.listStyle || "bullets"
  );
  const [websites, setWebsites] = useState<MinorStoryPresentationLink[]>(() => {
    const list: MinorStoryPresentationLink[] = [];
    const seen = new Set<string>();

    const rawWebsites = initialData.websites || initialData.links || [];
    for (const w of rawWebsites) {
      if (w.url?.trim()) {
        const url = w.url.trim();
        if (!seen.has(url.toLowerCase())) {
          seen.add(url.toLowerCase());
          list.push({ title: w.title || w.name || "", url });
        }
      }
    }

    if (list.length === 0 && initialData.demoUrl?.trim()) {
      list.push({
        title: initialData.demoTitle?.trim() || "",
        url: initialData.demoUrl.trim(),
      });
    }

    return list;
  });
  const [documents, setDocuments] = useState<MinorStoryPresentationDocument[]>(() => {
    const docs: MinorStoryPresentationDocument[] = [];
    if (initialData.documents && initialData.documents.length > 0) {
      for (const d of initialData.documents) {
        if (d.url?.trim()) docs.push({ title: d.title || "", url: d.url });
      }
    }
    if (initialData.images && initialData.images.length > 0) {
      for (const img of initialData.images) {
        if (img.url?.trim() && !isImageUrl(img.url) && !docs.some((d) => d.url === img.url)) {
          docs.push({ title: img.caption || "", url: img.url });
        }
      }
    }
    return docs;
  });
  const [images, setImages] = useState<Array<{ url: string; caption?: string }>>(() => {
    return (initialData.images || []).filter((img) => isImageUrl(img.url));
  });

  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [expandedBlocks, setExpandedBlocks] = useState<{
    bullets: boolean;
    websites: boolean;
    documents: boolean;
    images: boolean;
  }>(() => {
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

  function toggleBlock(key: "bullets" | "websites" | "documents" | "images") {
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
      const cleanWebsites: MinorStoryPresentationLink[] = [
        ...websites
          .map((w) => ({
            title: (w.title || w.name || "").trim(),
            url: w.url.trim(),
          }))
          .filter((w) => w.url.length > 0)
          .map((w) => ({
            title: w.title || w.url,
            url: w.url,
          })),
      ];

      const cleanImages: Array<{ url: string; caption?: string }> = [];
      const cleanDocs: MinorStoryPresentationDocument[] = [
        ...documents
          .map((d) => ({ title: d.title.trim() || d.url.trim(), url: d.url.trim() }))
          .filter((d) => d.url.length > 0),
      ];

      for (const img of images) {
        const trimmed = img.url.trim();
        if (!trimmed) continue;
        if (isImageUrl(trimmed)) {
          cleanImages.push({ url: trimmed, caption: img.caption?.trim() || undefined });
        } else {
          // If a PDF or web URL was entered into images, route it to documents
          cleanDocs.push({ title: img.caption?.trim() || trimmed, url: trimmed });
        }
      }

      const payload: MinorStoryPresentationData = {
        enabled,
        layout,
        listStyle,
        bullets: bullets.map((b) => b.trim()).filter(Boolean),
        websites: cleanWebsites,
        links: cleanWebsites,
        demoUrl: cleanWebsites[0]?.url || undefined,
        demoTitle: cleanWebsites[0]?.title || undefined,
        documents: cleanDocs,
        images: cleanImages,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Failed to save presentation data:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const hasUnsavedChanges = useCallback((): boolean => {
    const origEnabled = initialData.enabled !== false;
    if (enabled !== origEnabled) return true;

    const origLayout = initialData.layout || "auto";
    if (layout !== origLayout) return true;

    const origListStyle = initialData.listStyle || "bullets";
    if (listStyle !== origListStyle) return true;

    const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
    const origBullets = (initialData.bullets || []).map((b) => b.trim()).filter(Boolean);
    if (JSON.stringify(cleanBullets) !== JSON.stringify(origBullets)) return true;

    const cleanWebsites = websites
      .map((w) => ({ title: (w.title || w.name || "").trim(), url: w.url.trim() }))
      .filter((w) => w.url.length > 0);
    const origWebsites = (initialData.websites || initialData.links || [])
      .map((w) => ({ title: (w.title || w.name || "").trim(), url: w.url.trim() }))
      .filter((w) => w.url.length > 0);
    if (origWebsites.length === 0 && initialData.demoUrl?.trim()) {
      origWebsites.push({
        title: initialData.demoTitle?.trim() || "",
        url: initialData.demoUrl.trim(),
      });
    }
    if (JSON.stringify(cleanWebsites) !== JSON.stringify(origWebsites)) return true;

    const cleanDocs = documents
      .map((d) => ({ title: d.title.trim(), url: d.url.trim() }))
      .filter((d) => d.url.length > 0);
    const origDocs = (initialData.documents || [])
      .map((d) => ({ title: d.title.trim(), url: d.url.trim() }))
      .filter((d) => d.url.length > 0);
    if (JSON.stringify(cleanDocs) !== JSON.stringify(origDocs)) return true;

    const cleanImages = images
      .map((i) => ({ url: i.url.trim(), caption: i.caption?.trim() || "" }))
      .filter((i) => i.url.length > 0);
    const origImages = (initialData.images || [])
      .map((i) => ({ url: i.url.trim(), caption: i.caption?.trim() || "" }))
      .filter((i) => i.url.length > 0);
    if (JSON.stringify(cleanImages) !== JSON.stringify(origImages)) return true;

    return false;
  }, [
    initialData,
    enabled,
    layout,
    listStyle,
    bullets,
    websites,
    documents,
    images,
  ]);

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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
          <div className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleBlock("bullets")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${
                    expandedBlocks.bullets ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <ListChecks className="size-4 text-brand shrink-0" />
                <span className="text-xs font-semibold text-zinc-200">
                  {t("Bulletpoints of genummerde punten")}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {bullets.filter((b) => b.trim().length > 0).length}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {expandedBlocks.bullets ? t("Inklappen") : t("Uitklappen")}
              </div>
            </button>

            {expandedBlocks.bullets && (
              <div className="p-4 pt-1 border-t border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setListStyle("bullets")}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
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
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
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
                    <span>{t("Punt toevoegen")}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bullets.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-xs w-5 text-center shrink-0">
                        {listStyle === "steps" ? `${idx + 1}.` : "•"}
                      </span>
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBullets((prev) => prev.map((item, i) => (i === idx ? val : item)));
                        }}
                        placeholder="bijv. API endpoints gerealiseerd volgens specificatie..."
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                      />
                      {bullets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBullets((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                          title={t("Verwijderen")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {bullets.length === 0 && (
                    <p className="text-zinc-500 italic text-xs py-1">
                      {t("Geen punten toegevoegd.")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Blok 2: Websites */}
          <div className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleBlock("websites")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${
                    expandedBlocks.websites ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <Globe className="size-4 text-brand shrink-0" />
                <span className="text-xs font-semibold text-zinc-200">
                  {t("Websites")}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {websites.length}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {expandedBlocks.websites ? t("Inklappen") : t("Uitklappen")}
              </div>
            </button>

            {expandedBlocks.websites && (
              <div className="p-4 pt-1 border-t border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="text-[11px] text-zinc-500">
                    {t("Voeg interactieve websites, webpagina's of live applicaties toe met een weergavenaam en URL.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWebsites((prev) => [...prev, { title: "", url: "" }]);
                      setExpandedBlocks((prev) => ({ ...prev, websites: true }));
                    }}
                    className="text-brand hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span>{t("Website toevoegen")}</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {websites.map((site, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={site.title || site.name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWebsites((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, title: val, name: val } : item))
                            );
                          }}
                          placeholder={t("Weergavenaam (bijv. Live Applicatie, Staging Omgeving)")}
                          className="sm:col-span-6 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand font-medium"
                        />
                        <input
                          type="text"
                          value={site.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWebsites((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                            );
                          }}
                          placeholder="https://..."
                          className="sm:col-span-5 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-brand"
                        />
                        <div className="sm:col-span-1 flex items-center justify-end gap-1">
                          {site.url.trim().length > 0 && (
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t("Testen in nieuw tabblad")}
                            >
                              <SquareArrowOutUpRight className="size-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setWebsites((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={t("Verwijderen")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {websites.length === 0 && (
                    <p className="text-zinc-500 italic text-xs py-2 text-center">
                      {t("Geen websites toegevoegd.")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Blok 3: Documenten (PDF of URL) */}
          <div className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleBlock("documents")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${
                    expandedBlocks.documents ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <FileText className="size-4 text-brand shrink-0" />
                <span className="text-xs font-semibold text-zinc-200">
                  {t("Documenten (PDF of URL)")}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {documents.length}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {expandedBlocks.documents ? t("Inklappen") : t("Uitklappen")}
              </div>
            </button>

            {expandedBlocks.documents && (
              <div className="p-4 pt-1 border-t border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="text-[11px] text-zinc-500">
                    {t("Toont in presentatie uitsluitend de titel met link-icoon naar een nieuw tabblad.")}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-brand hover:underline cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 transition-colors">
                      <Upload className="size-3.5" />
                      <span>{uploadingPdf ? t("Uploaden...") : t("PDF uploaden")}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        disabled={uploadingPdf}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePdfUpload(f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setDocuments((prev) => [...prev, { title: "", url: "" }])}
                      className="text-brand hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <Plus className="size-3.5" />
                      <span>{t("URL toevoegen")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocuments((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                            );
                          }}
                          placeholder="Titel (bijv. Onderzoeksrapport, Figma, Live Link)"
                          className="sm:col-span-6 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand font-medium"
                        />
                        <input
                          type="text"
                          value={doc.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocuments((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                            );
                          }}
                          placeholder="/api/minor/uploads/... of https://..."
                          className="sm:col-span-5 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-brand"
                        />
                        <div className="sm:col-span-1 flex items-center justify-end gap-1">
                          {doc.url.trim().length > 0 && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t("Testen in nieuw tabblad")}
                            >
                              <SquareArrowOutUpRight className="size-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={t("Verwijderen")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-zinc-500 italic text-xs py-2 text-center">
                      {t("Geen documenten of PDF's/URL's toegevoegd.")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Blok 4: Afbeeldingen */}
          <div className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleBlock("images")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${
                    expandedBlocks.images ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <ImageIcon className="size-4 text-brand shrink-0" />
                <span className="text-xs font-semibold text-zinc-200">
                  {t("Afbeeldingen")}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {images.length}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {expandedBlocks.images ? t("Inklappen") : t("Uitklappen")}
              </div>
            </button>

            {expandedBlocks.images && (
              <div className="p-4 pt-1 border-t border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="text-[11px] text-zinc-500">
                    {t("Beeldverhouding blijft intact (geen crop) en kan worden vergroot.")}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-brand hover:underline cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 transition-colors">
                      <Upload className="size-3.5" />
                      <span>{uploadingImage ? t("Uploaden...") : t("Afbeelding uploaden")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => [...prev, { url: "", caption: "" }])}
                      className="text-brand hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <Plus className="size-3.5" />
                      <span>{t("URL toevoegen")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-1 flex items-center justify-center">
                          {img.url.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.url}
                              alt=""
                              className="size-8 rounded object-contain bg-zinc-950 border border-white/10"
                            />
                          ) : (
                            <div className="size-8 rounded bg-zinc-950 border border-white/10 flex items-center justify-center text-zinc-600">
                              <ImageIcon className="size-4" />
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={img.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImages((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                            );
                          }}
                          placeholder="/api/minor/uploads/... of https://..."
                          className="sm:col-span-6 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-brand"
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
                          className="sm:col-span-4 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                        />
                        <div className="sm:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={t("Verwijderen")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <p className="text-zinc-500 italic text-xs py-2 text-center">
                      {t("Geen afbeeldingen toegevoegd.")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

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
