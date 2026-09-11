"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  LayoutGrid,
  Edit3,
  StickyNote,
  ListChecks,
} from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull, MinorStory, MinorStoryType, MinorStoryPresentationData } from "@/lib/api";
import { PresentationBackground } from "./presentation-background";
import { PresentationLightbox } from "./presentation-lightbox";
import { SlideIntro } from "./slide-intro";
import { SlideStory } from "./slide-story";
import { SlideOutro } from "./slide-outro";
import { PresentationStoryEditor } from "./presentation-story-editor";
import { PresentationCriteriaModal } from "./presentation-criteria-modal";
import { getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { api } from "@/lib/api";

interface SprintPresentationProps {
  sprint: MinorSprintFull;
  storyTypes: MinorStoryType[];
  onClose: () => void;
  onStoryUpdated?: (updatedStory: MinorStory) => void;
}

function isCurrentlyFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as unknown as {
    fullscreenElement?: Element;
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
  };
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

async function requestFullscreenAcrossBrowsers(targetElement?: HTMLElement | null): Promise<void> {
  if (typeof document === "undefined") return;

  const candidates = [
    targetElement,
    document.documentElement,
    document.body,
  ].filter(Boolean) as Array<{
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  }>;

  for (const el of candidates) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return;
      }
      if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
        return;
      }
      if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        return;
      }
    } catch {
      // Continue to next candidate
    }
  }
}

async function exitFullscreenAcrossBrowsers(): Promise<void> {
  if (typeof document === "undefined") return;
  const doc = document as unknown as {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return;
    }
    if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return;
    }
    if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return;
    }
  } catch (err) {
    console.error("Exit fullscreen error:", err);
  }
}

export function SprintPresentation({
  sprint,
  storyTypes,
  onClose,
  onStoryUpdated,
}: SprintPresentationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter stories included in presentation (default true unless explicitly false)
  const presentedStories = useMemo(() => {
    return sprint.stories.filter((s) => s.presentationData?.enabled !== false);
  }, [sprint.stories]);

  // Slides structure: 0 = Intro, 1..N = Stories, N+1 = Outro
  const totalSlides = 2 + presentedStories.length;
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Lightbox & Modal states
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [editingStory, setEditingStory] = useState<MinorStory | null>(null);
  const [viewingCriteriaStory, setViewingCriteriaStory] = useState<MinorStory | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isCurrentlyFullscreen());
  const [fullscreenToast, setFullscreenToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hiding control bar timer
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, []);

  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentSlideIndex]);

  // Focus presentation container on mount for immediate keyboard control
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Track fullscreen changes across all rendering engines
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(isCurrentlyFullscreen());
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Determine current active story and story color
  const isIntroSlide = currentSlideIndex === 0;
  const isOutroSlide = currentSlideIndex === totalSlides - 1;
  const currentStory =
    !isIntroSlide && !isOutroSlide ? presentedStories[currentSlideIndex - 1] : null;

  const currentAccentColor = useMemo(() => {
    if (isIntroSlide || isOutroSlide || !currentStory) {
      return "#00e3a4"; // Brand signal green
    }
    const typeDetails = getStoryTypeDetails(currentStory.storyTypeCode, storyTypes);
    return typeDetails.color || "#00e3a4";
  }, [isIntroSlide, isOutroSlide, currentStory, storyTypes]);

  const currentStoryTypeCode = useMemo(() => {
    if (isIntroSlide) return "INTRO";
    if (isOutroSlide) return "OUTRO";
    return currentStory?.storyTypeCode || "US";
  }, [isIntroSlide, isOutroSlide, currentStory]);

  // Navigation handlers
  const goToNextSlide = useCallback(() => {
    resetIdleTimer();
    setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides, resetIdleTimer]);

  const goToPrevSlide = useCallback(() => {
    resetIdleTimer();
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  }, [resetIdleTimer]);

  const goToSlide = useCallback((index: number) => {
    resetIdleTimer();
    setCurrentSlideIndex(Math.max(0, Math.min(index, totalSlides - 1)));
    setIsOverviewOpen(false);
  }, [totalSlides, resetIdleTimer]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      const willBeFullscreen = !isCurrentlyFullscreen();
      if (willBeFullscreen) {
        await requestFullscreenAcrossBrowsers(containerRef.current);
      } else {
        await exitFullscreenAcrossBrowsers();
      }
      setIsFullscreen(isCurrentlyFullscreen());

      // Show brief feedback toast
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setFullscreenToast(
        willBeFullscreen
          ? t("Volledig scherm geactiveerd")
          : t("Volledig scherm verlaten")
      );
      toastTimerRef.current = setTimeout(() => {
        setFullscreenToast(null);
      }, 2200);
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  }, []);

  // Keyboard navigation & Shortcuts (including F for fullscreen)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      // Check for F key press to toggle fullscreen
      const isFKey =
        e.key === "f" ||
        e.key === "F" ||
        e.code === "KeyF" ||
        e.keyCode === 70;

      if (isFKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
        return;
      }

      // Ignore other navigation keys if lightbox, editor, or criteria modal is active
      if (lightboxImage !== null || editingStory !== null || viewingCriteriaStory !== null) {
        return;
      }

      resetIdleTimer();

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          goToNextSlide();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          goToPrevSlide();
          break;
        case "Home":
          e.preventDefault();
          goToSlide(0);
          break;
        case "End":
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case "g":
        case "G":
          e.preventDefault();
          setIsOverviewOpen((prev) => !prev);
          break;
        case "c":
        case "C":
          if (currentStory) {
            e.preventDefault();
            setViewingCriteriaStory((prev) => (prev ? null : currentStory));
          }
          break;
        case "Escape":
          if (!isCurrentlyFullscreen()) {
            onClose();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    lightboxImage,
    editingStory,
    viewingCriteriaStory,
    currentStory,
    goToNextSlide,
    goToPrevSlide,
    goToSlide,
    totalSlides,
    toggleFullscreen,
    onClose,
    resetIdleTimer,
  ]);

  // Touch Swipe gestures for tablet / touchscreens
  const touchStartXRef = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNextSlide();
      else goToPrevSlide();
    }
    touchStartXRef.current = null;
  }

  // Handle saving updated presentation data for current story
  async function handleSaveStoryPresentation(data: MinorStoryPresentationData) {
    if (!editingStory) return;
    try {
      const updated = await api.minor.sprints.stories.update(editingStory.id, {
        presentationData: data,
      });
      if (updated && onStoryUpdated) {
        onStoryUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to update story presentation:", err);
    }
  }


  // Handle criteria update inside criteria modal
  const handleStoryUpdatedInternal = useCallback(
    (updatedStory: MinorStory) => {
      if (onStoryUpdated) {
        onStoryUpdated(updatedStory);
      }
      setViewingCriteriaStory(updatedStory);
    },
    [onStoryUpdated]
  );

  const progressPercent =
    totalSlides > 1 ? (currentSlideIndex / (totalSlides - 1)) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onMouseMove={resetIdleTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-between select-none overflow-hidden outline-none"
    >
      {/* Dynamic Animated Ambient Background */}
      <PresentationBackground
        accentColor={currentAccentColor}
        storyTypeCode={currentStoryTypeCode}
        slideIndex={currentSlideIndex}
      />

      {/* Toast Notification for Fullscreen shortcut F */}
      {fullscreenToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900/95 border border-brand/40 text-white text-xs font-semibold shadow-[0_0_2rem_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center gap-2 pointer-events-none transition-all">
          <Maximize2 className="size-3.5 text-brand" />
          <span>{fullscreenToast}</span>
        </div>
      )}

      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-20">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: currentAccentColor,
            boxShadow: `0 0 10px ${currentAccentColor}`,
          }}
        />
      </div>

      {/* Top Header Controls (Floating Minimal) */}
      <div
        className={`absolute top-4 left-4 right-4 z-20 flex items-center justify-between transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/10 text-xs font-mono font-bold text-zinc-300 backdrop-blur-md">
            {sprint.sprintNumber}
          </span>
          <span className="text-xs font-medium text-zinc-400 hidden sm:inline truncate max-w-xs">
            {sprint.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
            title={t("Miniaturen & Overzicht")}
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">{t("Overzicht")}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
            title={isFullscreen ? t("Volledig scherm verlaten (F)") : t("Volledig scherm (F)")}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer backdrop-blur-md shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Content Canvas */}
      <div className="flex-1 flex items-center justify-center relative z-10 w-full overflow-y-auto px-4 py-12 sm:py-16">
        {isIntroSlide && (
          <SlideIntro
            sprint={sprint}
            stories={presentedStories}
            storyTypes={storyTypes}
            onStart={goToNextSlide}
          />
        )}

        {!isIntroSlide && !isOutroSlide && currentStory && (
          <SlideStory
            key={currentStory.id}
            story={currentStory}
            storyTypes={storyTypes}
            onImageClick={(img) => setLightboxImage(img)}
            onOpenCriteria={() => setViewingCriteriaStory(currentStory)}
          />
        )}

        {isOutroSlide && (
          <SlideOutro
            sprint={sprint}
            stories={presentedStories}
            onRestart={() => goToSlide(0)}
            onClose={onClose}
          />
        )}
      </div>

      {/* Presenter Notes Bar (Collapsible Peek) */}
      {showNotes && currentStory?.presentationData?.notes && (
        <div className="relative z-20 mx-auto mb-2 max-w-3xl w-full px-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs backdrop-blur-md flex items-start gap-2.5 shadow-xl">
            <StickyNote className="size-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1">
              <span className="font-bold block text-amber-300 mb-0.5">
                {t("Presentator notities")}:
              </span>
              <p className="leading-relaxed">{currentStory.presentationData.notes}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotes(false)}
              className="text-amber-400 hover:text-amber-200 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div
        className={`relative z-20 pb-4 sm:pb-6 flex justify-center px-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-md">
          {/* Previous Button */}
          <button
            type="button"
            onClick={goToPrevSlide}
            disabled={currentSlideIndex === 0}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            title={t("Vorige dia")}
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Slide Indicator (Click to open overview) */}
          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={t("Klik voor overzicht")}
          >
            <span style={{ color: currentAccentColor }}>
              {String(currentSlideIndex + 1).padStart(2, "0")}
            </span>{" "}
            / {String(totalSlides).padStart(2, "0")}
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={goToNextSlide}
            disabled={currentSlideIndex === totalSlides - 1}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            title={t("Volgende dia")}
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

          {/* Criteria button (Acceptance & Quality criteria) */}
          {currentStory && (
            <button
              type="button"
              onClick={() => setViewingCriteriaStory(currentStory)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                viewingCriteriaStory
                  ? "text-brand bg-brand/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
              title={t("Acceptatie- & Kwaliteitscriteria bekijken (C)")}
            >
              <ListChecks className="size-4" />
            </button>
          )}

          {/* Edit Presentation Content for this story */}
          {currentStory && (
            <button
              type="button"
              onClick={() => setEditingStory(currentStory)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t("Show & Tell content bewerken")}
            >
              <Edit3 className="size-4" />
            </button>
          )}

          {/* Presenter Notes toggle (if notes exist) */}
          {currentStory?.presentationData?.notes && (
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showNotes
                  ? "text-amber-400 bg-amber-400/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
              title={t("Presentator notities tonen/verbergen")}
            >
              <StickyNote className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slide Thumbnails / Overview Drawer */}
      {isOverviewOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsOverviewOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-4.5 text-brand" />
                <h3 className="text-base font-bold text-white">
                  {t("Presentatie Overzicht ({count} dia's)", { count: String(totalSlides) })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOverviewOpen(false)}
                className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
                title={t("Sluiten")}
                aria-label={t("Sluiten")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {/* Slide 0: Intro */}
              <div
                onClick={() => goToSlide(0)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  currentSlideIndex === 0
                    ? "bg-brand/10 border-brand text-white shadow-lg"
                    : "bg-zinc-950 border-white/10 hover:border-white/30 text-zinc-400"
                }`}
              >
                <span className="text-[10px] font-mono block opacity-60">01. {t("Intro")}</span>
                <span className="text-xs font-bold block truncate text-white mt-1">
                  {sprint.name}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">
                  {sprint.sprintNumber}
                </span>
              </div>

              {/* Story Slides */}
              {presentedStories.map((st, idx) => {
                const slideNum = idx + 1;
                const isCurrent = currentSlideIndex === slideNum;
                const typeDetails = getStoryTypeDetails(st.storyTypeCode, storyTypes);
                const color = typeDetails.color || "#00e3a4";
                return (
                  <div
                    key={st.id}
                    onClick={() => goToSlide(slideNum)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? "bg-zinc-800 border-white/50 text-white shadow-lg"
                        : "bg-zinc-950 border-white/10 hover:border-white/30 text-zinc-400"
                    }`}
                    style={{
                      borderColor: isCurrent ? color : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono opacity-60">
                        {String(slideNum + 1).padStart(2, "0")}.
                      </span>
                      <span
                        className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded truncate max-w-[130px]"
                        style={{
                          color,
                          backgroundColor: `${color}15`,
                          border: `1px solid ${color}30`,
                        }}
                        title={typeDetails.name}
                      >
                        {typeDetails.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold block truncate text-white mt-1">
                      {st.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate mt-0.5">
                      {st.storyNumber || "Story"}
                    </span>
                  </div>
                );
              })}

              {/* Last Slide: Outro */}
              <div
                onClick={() => goToSlide(totalSlides - 1)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  currentSlideIndex === totalSlides - 1
                    ? "bg-brand/10 border-brand text-white shadow-lg"
                    : "bg-zinc-950 border-white/10 hover:border-white/30 text-zinc-400"
                }`}
              >
                <span className="text-[10px] font-mono block opacity-60">
                  {String(totalSlides).padStart(2, "0")}. {t("Afsluiting")}
                </span>
                <span className="text-xs font-bold block truncate text-white mt-1">
                  {t("Vragen & Feedback")}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">
                  {t("Q&A")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Lightbox */}
      <PresentationLightbox key={lightboxImage?.url} image={lightboxImage} onClose={() => setLightboxImage(null)} />

      {/* Criteria Inspector Modal */}
      {viewingCriteriaStory && (
        <PresentationCriteriaModal
          story={viewingCriteriaStory}
          storyTypes={storyTypes}
          onClose={() => setViewingCriteriaStory(null)}
          onStoryUpdated={handleStoryUpdatedInternal}
        />
      )}

      {/* Story Presentation Editor Modal */}
      {editingStory && (
        <PresentationStoryEditor
          story={editingStory}
          onSave={handleSaveStoryPresentation}
          onClose={() => setEditingStory(null)}
        />
      )}
    </div>
  );
}
