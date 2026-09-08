"use client";

import { useMemo } from "react";
import {
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Globe,
  GitBranch,
  FileText,
  Layers,
  ListChecks,
} from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStory, MinorStoryType } from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";

interface SlideStoryProps {
  story: MinorStory;
  storyTypes: MinorStoryType[];
  onImageClick: (image: { url: string; caption?: string }) => void;
  onOpenCriteria?: () => void;
}

function HighlightsList({
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
        {t("Geen specifieke bulletpoints opgegeven.")}
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

  // Images: custom or fallback from evidence
  const images = useMemo(() => {
    if (presentationData.images && presentationData.images.length > 0) {
      return presentationData.images;
    }
    const evidenceImages = (story.evidence || [])
      .filter((e) => {
        const lower = e.url.toLowerCase();
        return (
          lower.endsWith(".png") ||
          lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".webp") ||
          lower.endsWith(".svg") ||
          lower.includes("/uploads/")
        );
      })
      .map((e) => ({ url: e.url, caption: e.title }));
    return evidenceImages;
  }, [presentationData.images, story.evidence]);

  // Demo URL: custom or fallback from evidence
  const demoUrl = useMemo(() => {
    if (presentationData.demoUrl?.trim()) return presentationData.demoUrl.trim();
    const appEvidence = (story.evidence || []).find(
      (e) => e.type === "app" || (e.type === "link" && (e.title.toLowerCase().includes("live") || e.title.toLowerCase().includes("demo")))
    );
    return appEvidence?.url || null;
  }, [presentationData.demoUrl, story.evidence]);

  const demoTitle = presentationData.demoTitle?.trim() || t("Bekijk live applicatie");

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

  // Summary text
  const summaryText = useMemo(() => {
    if (presentationData.summary?.trim()) return presentationData.summary.trim();
    if (story.iWant) {
      const asA = story.asA ? `${story.asA}` : "";
      const want = story.iWant;
      const soThat = story.soThat ? ` zodat ${story.soThat}` : "";
      return asA ? `Als ${asA} wil ik ${want}${soThat}.` : `${want}${soThat}.`;
    }
    return null;
  }, [presentationData.summary, story.asA, story.iWant, story.soThat]);

  // Determine layout
  const activeLayout = useMemo(() => {
    const pref = presentationData.layout || "auto";
    if (pref !== "auto") return pref;
    if (images.length >= 2) return "media";
    if (images.length === 1) return "split";
    if (demoUrl) return "demo";
    return "bullets";
  }, [presentationData.layout, images.length, demoUrl]);

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
      <h2 className="font-display text-2xl sm:text-4xl text-white tracking-tight leading-snug mb-3">
        {story.title}
      </h2>

      {/* Story Context / User Story sentence */}
      {summaryText && (
        <p className="text-sm sm:text-base text-zinc-300 mb-6 italic bg-zinc-950/60 p-3.5 rounded-xl border border-white/5 max-w-4xl">
          &ldquo;{summaryText}&rdquo;
        </p>
      )}

      {/* DYNAMIC CONTENT LAYOUTS */}

      {/* LAYOUT 1: SPLIT (Text & Single Media/Demo) */}
      {activeLayout === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
          {/* Left Column: Highlights & Links */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm uppercase font-bold tracking-wider text-zinc-300">
                <Sparkles className="size-4" style={{ color: storyColor }} />
                <span>{t("Wat is er gerealiseerd")}</span>
              </div>
              <HighlightsList
                bullets={bullets}
                listStyle={listStyle}
                storyColor={storyColor}
                size="large"
              />
            </div>

            {/* Clickable Demo Link */}
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border hover:bg-zinc-800 transition-all group cursor-pointer"
                style={{ borderColor: `${storyColor}40` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${storyColor}20`, color: storyColor }}
                  >
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block group-hover:text-brand transition-colors">
                      {demoTitle}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono truncate max-w-xs block">
                      {demoUrl}
                    </span>
                  </div>
                </div>
                <ExternalLink className="size-4 text-zinc-400 group-hover:text-white transition-colors" />
              </a>
            )}
          </div>

          {/* Right Column: Hero Image with Click to Zoom */}
          <div className="lg:col-span-6">
            {images.length > 0 && (
              <div
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl cursor-pointer"
                onClick={() => onImageClick(images[0])}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0].url}
                  alt={images[0].caption || story.title}
                  className="w-full max-h-[460px] object-cover sm:object-contain bg-zinc-950 transition-transform duration-300 group-hover:scale-[1.02]"
                />
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
            )}
          </div>
        </div>
      )}

      {/* LAYOUT 2: MEDIA GALLERY (Multiple Images Grid) */}
      {activeLayout === "media" && (
        <div className="space-y-4 mt-2">
          {bullets.length > 0 && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-900/70 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-zinc-300">
                <Sparkles className="size-3.5" style={{ color: storyColor }} />
                <span>{t("Wat is er gerealiseerd")}</span>
              </div>
              <HighlightsList
                bullets={bullets.slice(0, 4)}
                listStyle={listStyle}
                storyColor={storyColor}
                size="medium"
              />
            </div>
          )}

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
                className="group relative rounded-xl overflow-hidden border border-white/10 bg-zinc-950 cursor-pointer shadow-lg hover:border-white/30 transition-all"
                onClick={() => onImageClick(img)}
              >
                <div className="h-48 sm:h-56 overflow-hidden flex items-center justify-center bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.caption || `Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

          {demoUrl && (
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
              <div className="text-xs uppercase font-bold tracking-wider text-zinc-400">
                {t("Opgeleverde functionaliteit")}
              </div>
              <HighlightsList
                bullets={bullets}
                listStyle={listStyle}
                storyColor={storyColor}
                size="large"
              />
            </div>
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
                  <span>{t("Open Live Product")}</span>
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
            <div className="flex items-center gap-2 text-sm uppercase font-bold tracking-wider text-zinc-200">
              <Sparkles className="size-4.5" style={{ color: storyColor }} />
              <span>{t("Wat is er gerealiseerd")}</span>
            </div>
            <HighlightsList
              bullets={bullets}
              listStyle={listStyle}
              storyColor={storyColor}
              size="large"
            />
          </div>

          {/* Card 2: Quality & Evidence */}
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

            {/* Evidence items */}
            <div className="space-y-2">
              {(story.evidence || []).map((ev) => (
                <a
                  key={ev.id}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-white/5 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {ev.type === "github" ? (
                      <GitBranch className="size-4 text-zinc-400" />
                    ) : ev.type === "document" ? (
                      <FileText className="size-4 text-zinc-400" />
                    ) : (
                      <Globe className="size-4 text-zinc-400" />
                    )}
                    <span className="font-medium truncate">{ev.title}</span>
                  </div>
                  <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
                </a>
              ))}
              {(!story.evidence || story.evidence.length === 0) && (
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
