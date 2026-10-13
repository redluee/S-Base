"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Maximize2, StickyNote } from "lucide-react";
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
import {
  exitFullscreenAcrossBrowsers,
  isCurrentlyFullscreen,
  requestFullscreenAcrossBrowsers,
} from "./presentation-fullscreen";
import { PresentationTopBar } from "./presentation-top-bar";
import { PresentationBottomBar } from "./presentation-bottom-bar";
import { PresentationOverview } from "./presentation-overview";

interface SprintPresentationProps {
  sprint: MinorSprintFull;
  storyTypes: MinorStoryType[];
  onClose: () => void;
  onStoryUpdated?: (updatedStory: MinorStory) => void;
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
      data-minor-theme="dark"
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

      <PresentationTopBar
        sprint={sprint}
        controlsVisible={controlsVisible}
        isFullscreen={isFullscreen}
        onOpenOverview={() => setIsOverviewOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onClose={onClose}
      />

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

      <PresentationBottomBar
        controlsVisible={controlsVisible}
        currentSlideIndex={currentSlideIndex}
        totalSlides={totalSlides}
        currentAccentColor={currentAccentColor}
        currentStory={currentStory}
        criteriaOpen={Boolean(viewingCriteriaStory)}
        showNotes={showNotes}
        onPrev={goToPrevSlide}
        onNext={goToNextSlide}
        onOpenOverview={() => setIsOverviewOpen(true)}
        onViewCriteria={() => currentStory && setViewingCriteriaStory(currentStory)}
        onEdit={() => currentStory && setEditingStory(currentStory)}
        onToggleNotes={() => setShowNotes((prev) => !prev)}
      />

      {isOverviewOpen && (
        <PresentationOverview
          sprint={sprint}
          presentedStories={presentedStories}
          storyTypes={storyTypes}
          totalSlides={totalSlides}
          currentSlideIndex={currentSlideIndex}
          goToSlide={goToSlide}
          onClose={() => setIsOverviewOpen(false)}
        />
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
