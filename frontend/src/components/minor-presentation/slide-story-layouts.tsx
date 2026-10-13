import { toExternalHref } from "@/lib/uri";
import { ExternalLink, Maximize2, Globe, GitBranch, FileText, Layers, ListChecks } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStory } from "@/lib/api";
import { DocumentLinkCard, PointsList, WebsiteLinkCard } from "./slide-story-cards";

type Link = { url: string; title: string };
type Img = { url: string; caption?: string };

export interface SlideLayoutProps {
  story: MinorStory;
  storyColor: string;
  bullets: string[];
  listStyle: "bullets" | "steps";
  websites: Link[];
  documents: Link[];
  images: Img[];
  demoUrl: string | null;
  demoTitle: string;
  onImageClick: (image: Img) => void;
  onOpenCriteria?: () => void;
}

export function SplitLayout({
  story, storyColor, bullets, listStyle, websites, documents, images, demoUrl, demoTitle, onImageClick,
}: SlideLayoutProps) {
  return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* Left Column: Points, Websites & Documents */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-lg space-y-4">
            <PointsList
              bullets={bullets}
              listStyle={listStyle}
              storyColor={storyColor}
              size="large"
            />
          </div>

          {/* Websites shown under points if images exist in the right column */}
          {images.length > 0 && websites.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {websites.map((w, idx) => (
                <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} />
              ))}
            </div>
          )}

          {/* Fallback Demo Link when no custom websites but demoUrl exists */}
          {images.length > 0 && websites.length === 0 && demoUrl && (
            <a
              href={toExternalHref(demoUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border hover:bg-zinc-800 transition-all group cursor-pointer"
              style={{ borderColor: `${storyColor}40` }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: `${storyColor}20`, color: storyColor }}
                >
                  <Globe className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white block group-hover:text-brand transition-colors break-words">
                    {demoTitle}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono truncate max-w-xs block">
                    {demoUrl}
                  </span>
                </div>
              </div>
              <ExternalLink className="size-4 text-zinc-400 group-hover:text-white transition-colors shrink-0 ml-2" />
            </a>
          )}

          {/* Documents shown under points if an image or websites panel is in the right column */}
          {images.length > 0 && documents.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Hero Image, Websites Panel, or Documents Panel */}
        <div className="lg:col-span-6">
          {images.length > 0 ? (
            <div
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl cursor-pointer flex flex-col"
              onClick={() => onImageClick(images[0])}
            >
              <div className="max-h-[480px] p-2 flex items-center justify-center bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0].url}
                  alt={images[0].caption || story.title}
                  className="w-full max-h-[460px] object-contain bg-zinc-950 transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-semibold">
                  <Maximize2 className="size-3.5" />
                  <span>{t("Afbeelding vergroten")}</span>
                </div>
              </div>
              {images[0].caption && (
                <div className="p-2.5 bg-zinc-900/90 border-t border-white/10 text-xs text-zinc-300 text-center">
                  {images[0].caption}
                </div>
              )}
            </div>
          ) : websites.length > 0 ? (
            <div className="space-y-3">
              {websites.map((w, idx) => (
                <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} size="large" />
              ))}
              {documents.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  {documents.map((doc, idx) => (
                    <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} size="large" />
                  ))}
                </div>
              )}
            </div>
          ) : documents.length > 0 ? (
            <div className="p-6 sm:p-7 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-xl space-y-3">
              {documents.map((doc, idx) => (
                <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} size="large" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
  );
}

export function MediaLayout({
  storyColor, bullets, listStyle, websites, documents, images, demoUrl, demoTitle, onImageClick,
}: SlideLayoutProps) {
  return (
      <div className="space-y-5 mt-2">
        {bullets.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-zinc-900/70 border border-white/10 space-y-3">
            <PointsList
              bullets={bullets.slice(0, 4)}
              listStyle={listStyle}
              storyColor={storyColor}
              size="medium"
            />
          </div>
        )}

        {/* Real Images Grid - uncropped, object-contain */}
        {images.length > 0 && (
          <div
            className={`grid gap-4 ${
              images.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : images.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl overflow-hidden border border-white/10 bg-zinc-950 cursor-pointer shadow-lg hover:border-white/30 transition-all flex flex-col"
                onClick={() => onImageClick(img)}
              >
                <div className="h-48 sm:h-56 p-2 overflow-hidden flex items-center justify-center bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.caption || `Afbeelding ${idx + 1}`}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/80 text-white text-[11px] font-semibold">
                    <Maximize2 className="size-3.5" />
                    <span>{t("Vergroten")}</span>
                  </div>
                </div>
                {img.caption && (
                  <div className="p-2 bg-zinc-900 text-[11px] text-zinc-300 truncate text-center border-t border-white/10">
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Websites Grid */}
        {websites.length > 0 && (
          <div
            className={`grid gap-3 ${
              websites.length === 1
                ? "grid-cols-1"
                : websites.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {websites.map((w, idx) => (
              <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} />
            ))}
          </div>
        )}

        {/* Documents Grid */}
        {documents.length > 0 && (
          <div
            className={`grid gap-3 ${
              documents.length === 1
                ? "grid-cols-1"
                : documents.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {documents.map((doc, idx) => (
              <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} />
            ))}
          </div>
        )}

        {websites.length === 0 && demoUrl && (
          <div className="flex justify-end pt-2">
            <a
              href={toExternalHref(demoUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white border transition-colors cursor-pointer"
              style={{ borderColor: `${storyColor}40` }}
            >
              <Globe className="size-3.5" style={{ color: storyColor }} />
              <span>{demoTitle}</span>
              <ExternalLink className="size-3 text-zinc-400" />
            </a>
          </div>
        )}
      </div>
  );
}

export function DemoLayout({
  storyColor, bullets, listStyle, websites, documents, demoUrl, demoTitle,
}: SlideLayoutProps) {
  return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-2">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
            <PointsList
              bullets={bullets}
              listStyle={listStyle}
              storyColor={storyColor}
              size="large"
            />
          </div>

          {/* Other websites if multiple exist */}
          {websites.length > 1 && (
            <div className="space-y-2 pt-1">
              {websites.slice(1).map((w, idx) => (
                <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} />
              ))}
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <div
            className="p-8 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-2xl text-center space-y-5 relative overflow-hidden"
            style={{
              boxShadow: `0 0 40px ${storyColor}15`,
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${storyColor}20`, color: storyColor }}
            >
              <Globe className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">{demoTitle}</h3>
              <p className="text-xs text-zinc-400 font-mono truncate max-w-md mx-auto">
                {demoUrl || "Productiedomein"}
              </p>
            </div>

            {demoUrl && (
              <a
                href={toExternalHref(demoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-zinc-950 transition-all transform hover:scale-105 cursor-pointer shadow-lg"
                style={{ backgroundColor: storyColor }}
              >
                <span>{t("Website openen")}</span>
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </div>
  );
}

export function BulletsLayout({
  story, storyColor, bullets, listStyle, websites, documents, demoUrl, demoTitle, onOpenCriteria,
}: SlideLayoutProps) {
  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Card 1: Deliverables */}
        <div className="p-6 sm:p-7 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-xl space-y-5">
          <PointsList
            bullets={bullets}
            listStyle={listStyle}
            storyColor={storyColor}
            size="large"
          />

          {/* Clickable Website Links if present */}
          {websites.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {websites.map((w, idx) => (
                <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} />
              ))}
            </div>
          )}

          {/* Clickable Demo Link fallback if no websites but demoUrl present */}
          {websites.length === 0 && demoUrl && (
            <a
              href={toExternalHref(demoUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/80 border hover:bg-zinc-800 transition-all group cursor-pointer"
              style={{ borderColor: `${storyColor}40` }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: `${storyColor}20`, color: storyColor }}
                >
                  <Globe className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white block group-hover:text-brand transition-colors break-words">
                    {demoTitle}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono truncate max-w-xs block">
                    {demoUrl}
                  </span>
                </div>
              </div>
              <ExternalLink className="size-4 text-zinc-400 group-hover:text-white transition-colors shrink-0 ml-2" />
            </a>
          )}
        </div>

        {/* Card 2: Quality, Documents & Evidence */}
        <div className="p-6 sm:p-7 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-sm uppercase font-bold tracking-wider text-zinc-200">
              <Layers className="size-4.5" style={{ color: storyColor }} />
              <span>{t("Kwaliteit & Bewijslast")}</span>
            </div>
            {onOpenCriteria && (
              <button
                type="button"
                onClick={onOpenCriteria}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-950 border border-white/10 hover:border-brand/40 text-brand transition-all cursor-pointer"
              >
                <ListChecks className="size-3.5" />
                <span>{t("Alle criteria")}</span>
              </button>
            )}
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="space-y-2 pb-2">
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} />
                ))}
              </div>
            </div>
          )}

          {/* Evidence items */}
          <div className="space-y-2">
            {(story.evidence || []).map((ev) => (
              <a
                key={ev.id}
                href={toExternalHref(ev.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-white/5 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer group gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {ev.type === "github" ? (
                    <GitBranch className="size-4 text-zinc-400 shrink-0" />
                  ) : ev.type === "document" ? (
                    <FileText className="size-4 text-zinc-400 shrink-0" />
                  ) : (
                    <Globe className="size-4 text-zinc-400 shrink-0" />
                  )}
                  <span className="font-medium break-words">{ev.title}</span>
                </div>
                <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
              </a>
            ))}
            {(!story.evidence || story.evidence.length === 0) && documents.length === 0 && (
              <p className="text-zinc-500 italic text-xs py-2">
                {t("Geen externe links of bewijsstukken gekoppeld.")}
              </p>
            )}
          </div>
        </div>
      </div>
  );
}
