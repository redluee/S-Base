"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ListChecks,
  SquareArrowOutUpRight,
  Globe,
} from "lucide-react";
import { toExternalHref } from "@/lib/uri";
import { t } from "@/lib/lang";
import type {
  MinorStoryPresentationDocument,
  MinorStoryPresentationLink,
} from "@/lib/api";
import type { PresentationImage, PresentationListStyle } from "./presentation-editor-utils";

function EditorBlock({
  icon,
  label,
  count,
  expanded,
  onToggle,
  children,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer select-none text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ChevronDown
            className={`size-4 text-zinc-400 transition-transform duration-200 ${
              expanded ? "rotate-0" : "-rotate-90"
            }`}
          />
          {icon}
          <span className="text-xs font-semibold text-zinc-200">{label}</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {count}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 font-medium">
          {expanded ? t("Inklappen") : t("Uitklappen")}
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

interface BlockProps {
  expanded: boolean;
  onToggle: () => void;
}

export function BulletsBlock({
  expanded, onToggle, bullets, setBullets, listStyle, setListStyle,
}: BlockProps & {
  bullets: string[];
  setBullets: Dispatch<SetStateAction<string[]>>;
  listStyle: PresentationListStyle;
  setListStyle: (v: PresentationListStyle) => void;
}) {
  return (
    <EditorBlock
      icon={<ListChecks className="size-4 text-brand shrink-0" />}
      label={t("Bulletpoints of genummerde punten")}
      count={bullets.filter((b) => b.trim().length > 0).length}
      expanded={expanded}
      onToggle={onToggle}
    >
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
    </EditorBlock>
  );
}

export function WebsitesBlock({
  expanded, onToggle, websites, setWebsites, onExpand,
}: BlockProps & {
  websites: MinorStoryPresentationLink[];
  setWebsites: Dispatch<SetStateAction<MinorStoryPresentationLink[]>>;
  onExpand: () => void;
}) {
  return (
    <EditorBlock
      icon={<Globe className="size-4 text-brand shrink-0" />}
      label={t("Websites")}
      count={websites.length}
      expanded={expanded}
      onToggle={onToggle}
    >
              <div className="p-4 pt-1 border-t border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="text-[11px] text-zinc-500">
                    {t("Voeg interactieve websites, webpagina's of live applicaties toe met een weergavenaam en URL.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWebsites((prev) => [...prev, { title: "", url: "" }]);
                      onExpand();
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
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,6fr)_minmax(0,5fr)_auto] gap-2 items-center">
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
                          className="min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand font-medium"
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
                          className="min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-brand"
                        />
                        <div className="flex items-center justify-end gap-1">
                          {site.url.trim().length > 0 && (
                            <a
                              href={toExternalHref(site.url)}
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
    </EditorBlock>
  );
}

export function DocumentsBlock({
  expanded, onToggle, documents, setDocuments, uploadingPdf, onPdfUpload,
}: BlockProps & {
  documents: MinorStoryPresentationDocument[];
  setDocuments: Dispatch<SetStateAction<MinorStoryPresentationDocument[]>>;
  uploadingPdf: boolean;
  onPdfUpload: (file: File) => void;
}) {
  return (
    <EditorBlock
      icon={<FileText className="size-4 text-brand shrink-0" />}
      label={t("Documenten (PDF of URL)")}
      count={documents.length}
      expanded={expanded}
      onToggle={onToggle}
    >
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
                          if (f) onPdfUpload(f);
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
                          className="min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand font-medium"
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
                          className="min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-brand"
                        />
                        <div className="flex items-center justify-end gap-1">
                          {doc.url.trim().length > 0 && (
                            <a
                              href={toExternalHref(doc.url)}
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
    </EditorBlock>
  );
}

export function ImagesBlock({
  expanded, onToggle, images, setImages, uploadingImage, onImageUpload,
}: BlockProps & {
  images: PresentationImage[];
  setImages: Dispatch<SetStateAction<PresentationImage[]>>;
  uploadingImage: boolean;
  onImageUpload: (file: File) => void;
}) {
  return (
    <EditorBlock
      icon={<ImageIcon className="size-4 text-brand shrink-0" />}
      label={t("Afbeeldingen")}
      count={images.length}
      expanded={expanded}
      onToggle={onToggle}
    >
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
                          if (f) onImageUpload(f);
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
    </EditorBlock>
  );
}
