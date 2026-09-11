"use client";

import { useMemo } from "react";
import {
  ExternalLink,
  CheckCircle2,
  Maximize2,
  Globe,
  GitBranch,
  FileText,
  Layers,
  ListChecks,
  SquareArrowOutUpRight,
} from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStory, MinorStoryType } from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc, isImageUrl } from "@/lib/minor-constants";

interface SlideStoryProps {
  story: MinorStory;
  storyTypes: MinorStoryType[];
  onImageClick: (image: { url: string; caption?: string }) => void;
  onOpenCriteria?: () => void;
}

function WebsiteLinkCard({
  website,
  storyColor,
  size = "normal",
}: {
  website: { url: string; title: string };
  storyColor: string;
  size?: "normal" | "large";
}) {
  const displayUrl = website.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return (
    <a
      href={website.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group flex items-center justify-between gap-3.5 rounded-2xl bg-zinc-900/85 border hover:bg-zinc-800/90 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
        size === "large" ? "p-4 sm:p-5" : "p-3 sm:p-3.5"
      }`}
      style={{
        borderColor: `${storyColor}40`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
            size === "large" ? "size-11 sm:size-12" : "size-9 sm:size-10"
          }`}
          style={{
            backgroundColor: `${storyColor}18`,
            color: storyColor,
            border: `1px solid ${storyColor}35`,
          }}
        >
          <Globe className={size === "large" ? "size-5 sm:size-6" : "size-4 sm:size-4.5"} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div
            className={`font-bold text-white group-hover:text-brand transition-colors break-words ${
              size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          >
            {website.title}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate max-w-xs sm:max-w-md block group-hover:text-zinc-300">
            {displayUrl}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 pl-2">
        {size === "large" && (
          <span
            className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{
              backgroundColor: `${storyColor}15`,
              color: storyColor,
            }}
          >
            {t("Website openen")}
          </span>
        )}
        <SquareArrowOutUpRight
          className={`text-zinc-400 group-hover:text-white transition-colors ${
            size === "large" ? "size-4.5" : "size-4"
          }`}
        />
      </div>
    </a>
  );
}

function DocumentLinkCard({
  doc,
  storyColor,
  size = "normal",
}: {
  doc: { url: string; title: string };
  storyColor: string;
  size?: "normal" | "large";
}) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center justify-between gap-3 rounded-xl bg-zinc-900/90 border hover:bg-zinc-800/90 transition-all group cursor-pointer shadow-md ${
        size === "large" ? "p-4 sm:p-5" : "p-3.5 sm:p-4"
      }`}
      style={{ borderColor: `${storyColor}35` }}
    >
      <span
        className={`font-semibold text-white group-hover:text-brand transition-colors break-words min-w-0 flex-1 ${
          size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm"
        }`}
      >
        {doc.title}
      </span>
      <SquareArrowOutUpRight
        className={`shrink-0 text-zinc-400 group-hover:text-white transition-colors ${
          size === "large" ? "size-4.5" : "size-4"
        }`}
      />
    </a>
  );
}

function PointsList({
  bullets,
  listStyle,
  storyColor,
  size = "large",
}: {
  bullets: string[];
  listStyle: "bullets" | "steps";
  storyColor: string;
  size?: "large" | "medium";
}) {
  if (bullets.length === 0) {
    return (
      <p className="text-zinc-500 italic text-sm py-2">
        {t("Geen punten opgegeven.")}
      </p>
    );
  }

  return (
    <ul className={size === "large" ? "space-y-4" : "space-y-3"}>
      {bullets.map((bullet, idx) => (
        <li key={idx} className="flex items-start gap-3 sm:gap-4">
          {listStyle === "steps" ? (
            <span
              className={`flex items-center justify-center rounded-lg font-mono font-bold shrink-0 mt-0.5 shadow-sm ${
                size === "large"
                  ? "size-7 sm:size-8 text-sm sm:text-base"
                  : "size-6 text-xs"
              }`}
              style={{
                backgroundColor: `${storyColor}20`,
                color: storyColor,
                border: `1px solid ${storyColor}50`,
              }}
            >
              {idx + 1}
            </span>
          ) : (
            <CheckCircle2
              className={`shrink-0 mt-0.5 ${
                size === "large" ? "size-6 sm:size-7" : "size-5"
              }`}
              style={{ color: storyColor }}
            />
          )}
          <span
            className={`leading-relaxed text-zinc-100 flex-1 font-medium ${
              size === "large" ? "text-base sm:text-xl" : "text-sm sm:text-base"
            }`}
          >
            {bullet}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SlideStory({
  story,
  storyTypes,
  onImageClick,
  onOpenCriteria,
}: SlideStoryProps) {
  const typeDetails = useMemo(() => {
    return getStoryTypeDetails(story.storyTypeCode, storyTypes);
  }, [story.storyTypeCode, storyTypes]);

  const storyColor = typeDetails.color || "#00e3a4";

  // Resolved presentation content
  const presentationData = story.presentationData || {};

  // List style (bullets vs numbered steps) set via presentation editor
  const listStyle = presentationData.listStyle || "bullets";

  // Criteria counts for top badge
  const totalCriteriaCount = story.criteria?.length || 0;
  const completedCriteriaCount = (story.criteria || []).filter((c) => c.isCompleted).length;

  // Resolve presentation websites (interactive links, live demos, etc.)
  const websites = useMemo(() => {
    const rawWebsites = presentationData.websites || presentationData.links || [];
    const list: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();

    for (const w of rawWebsites) {
      if (!w.url?.trim()) continue;
      const url = w.url.trim();
      const title = (w.title || w.name)?.trim() || w.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    // Fallback: If no websites configured, check demoUrl or evidence for live app/links
    if (list.length === 0) {
      if (presentationData.demoUrl?.trim()) {
        const url = presentationData.demoUrl.trim();
        list.push({
          url,
          title: presentationData.demoTitle?.trim() || t("Live Applicatie"),
        });
        seen.add(url.toLowerCase());
      } else {
        const appEvidence = (story.evidence || []).filter(
          (e) =>
            e.type === "app" ||
            (e.type === "link" &&
              (e.title.toLowerCase().includes("live") ||
                e.title.toLowerCase().includes("demo") ||
                e.title.toLowerCase().includes("staging") ||
                e.title.toLowerCase().includes("website") ||
                e.title.toLowerCase().includes("app")))
        );
        for (const ev of appEvidence) {
          if (ev.url?.trim() && !seen.has(ev.url.trim().toLowerCase())) {
            seen.add(ev.url.trim().toLowerCase());
            list.push({ url: ev.url.trim(), title: ev.title.trim() });
          }
        }
      }
    }

    return list;
  }, [
    presentationData.websites,
    presentationData.links,
    presentationData.demoUrl,
    presentationData.demoTitle,
    story.evidence,
  ]);

  // Resolve presentation documents (PDFs and URLs)
  const documents = useMemo(() => {
    const rawDocs = presentationData.documents || [];
    const rawImages = presentationData.images || [];

    const list: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();

    for (const d of rawDocs) {
      if (!d.url?.trim()) continue;
      const url = d.url.trim();
      const title = d.title?.trim() || d.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    // Include non-image URLs from rawImages
    for (const img of rawImages) {
      if (!img.url?.trim() || isImageUrl(img.url)) continue;
      const url = img.url.trim();
      const title = img.caption?.trim() || img.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    return list;
  }, [presentationData.documents, presentationData.images]);

  // Resolve presentation images (only valid image URLs)
  const images = useMemo(() => {
    const rawImages = presentationData.images || [];
    const realImages: Array<{ url: string; caption?: string }> = [];

    for (const item of rawImages) {
      if (item.url?.trim() && isImageUrl(item.url)) {
        realImages.push(item);
      }
    }

    // Fallback: If no custom images provided, fallback to evidence images
    if (realImages.length === 0 && (!presentationData.images || presentationData.images.length === 0)) {
      const evidenceImages = (story.evidence || [])
        .filter((e) => isImageUrl(e.url))
        .map((e) => ({ url: e.url, caption: e.title }));
      return evidenceImages;
    }

    return realImages;
  }, [presentationData.images, story.evidence]);

  // Primary website and demo details
  const primaryWebsite = websites[0] || null;
  const demoUrl = primaryWebsite ? primaryWebsite.url : (presentationData.demoUrl?.trim() || null);
  const demoTitle = primaryWebsite ? primaryWebsite.title : (presentationData.demoTitle?.trim() || t("Bekijk live applicatie"));

  // Bullets: custom or fallback from criteria
  const bullets = useMemo(() => {
    if (presentationData.bullets && presentationData.bullets.length > 0) {
      return presentationData.bullets.filter((b) => b.trim().length > 0);
    }
    // Fallback to acceptance criteria
    const criteriaTexts = (story.criteria || [])
      .filter((c) => c.text.trim())
      .map((c) => c.text.trim());
    return criteriaTexts.slice(0, 5);
  }, [presentationData.bullets, story.criteria]);

  // Determine layout
  const activeLayout = useMemo(() => {
    const pref = presentationData.layout || "auto";
    if (pref !== "auto") return pref;
    if (images.length >= 2) return "media";
    if (images.length === 1) return "split";
    if (websites.length === 1 && documents.length === 0 && images.length === 0) return "demo";
    if (websites.length > 0 && images.length === 0) return "split";
    if (demoUrl) return "demo";
    if (documents.length >= 2) return "media";
    if (documents.length === 1) return "split";
    return "bullets";
  }, [presentationData.layout, images.length, websites.length, documents.length, demoUrl]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col justify-center min-h-[72vh] px-4 sm:px-8 py-4 animate-in fade-in duration-200 select-text">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <StoryTypeBadge
            code={story.storyTypeCode}
            storyTypes={storyTypes}
            fullNameOnly
            size="md"
          />
          {story.storyNumber && (
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border"
              style={{
                borderColor: `${storyColor}40`,
                backgroundColor: `${storyColor}15`,
                color: storyColor,
              }}
            >
              {story.storyNumber}
            </span>
          )}
          <span
            className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-lg ${
              story.status === "done"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-300 border border-white/10"
            }`}
          >
            {story.status === "done" ? t("Voltooid") : story.status === "in_progress" ? t("Bezig") : t("To Do")}
          </span>

          {/* Criteria button */}
          {onOpenCriteria && (
            <button
              type="button"
              onClick={onOpenCriteria}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 border border-white/10 hover:border-brand/40 text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm group"
              title={t("Acceptatie- en kwaliteitscriteria inzien")}
            >
              <ListChecks className="size-4 text-brand group-hover:scale-110 transition-transform" />
              <span>{t("Criteria")}</span>
              {totalCriteriaCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                  {completedCriteriaCount}/{totalCriteriaCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Learning Outcome Tags */}
        <div className="flex items-center gap-1.5">
          {(story.learningOutcomes || []).map((lu) => (
            <span
              key={lu}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-zinc-900 border border-white/10 text-zinc-300"
              title={getLUShortDesc(lu)}
            >
              LU {lu}
            </span>
          ))}
        </div>
      </div>

      {/* Story Title */}
      <h2 className="font-display text-2xl sm:text-4xl text-white tracking-tight leading-snug mb-4">
        {story.title}
      </h2>

      {/* DYNAMIC CONTENT LAYOUTS */}

      {/* LAYOUT 1: SPLIT (Text & Single Media/Demo/Websites) */}
      {activeLayout === "split" && (
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
                href={demoUrl}
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
              <div className="p-6 sm:p-7 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 text-sm uppercase font-bold tracking-wider text-zinc-200">
                    <Globe className="size-4.5" style={{ color: storyColor }} />
                    <span>{t("Websites")}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {websites.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {websites.map((w, idx) => (
                    <WebsiteLinkCard key={idx} website={w} storyColor={storyColor} size="large" />
                  ))}
                </div>
                {documents.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-white/5">
                    <span className="text-xs font-semibold text-zinc-400 block">{t("Documenten")}</span>
                    {documents.map((doc, idx) => (
                      <DocumentLinkCard key={idx} doc={doc} storyColor={storyColor} />
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
      )}

      {/* LAYOUT 2: MEDIA GALLERY (Multiple Images Grid, Websites & Documents) */}
      {activeLayout === "media" && (
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
                href={demoUrl}
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
      )}

      {/* LAYOUT 3: LIVE DEMO FOCUS */}
      {activeLayout === "demo" && (
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
                  href={demoUrl}
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

              <p className="text-xs text-zinc-400 italic">
                {t("Klik om de gedeployde applicatie in een nieuw venster te demonstreren.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT 4: BULLETS & FEATURES (Text Heavy / Technical / Research) */}
      {activeLayout === "bullets" && (
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
                href={demoUrl}
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
                  href={ev.url}
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
      )}
    </div>
  );
}
