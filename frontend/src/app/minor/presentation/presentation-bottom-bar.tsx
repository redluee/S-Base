import { ChevronLeft, ChevronRight, Edit3, StickyNote, ListChecks } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStory } from "@/lib/api";

interface PresentationBottomBarProps {
  controlsVisible: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  currentAccentColor: string;
  currentStory: MinorStory | null;
  criteriaOpen: boolean;
  showNotes: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenOverview: () => void;
  onViewCriteria: () => void;
  onEdit: () => void;
  onToggleNotes: () => void;
}

export function PresentationBottomBar({
  controlsVisible,
  currentSlideIndex,
  totalSlides,
  currentAccentColor,
  currentStory,
  criteriaOpen,
  showNotes,
  onPrev,
  onNext,
  onOpenOverview,
  onViewCriteria,
  onEdit,
  onToggleNotes,
}: PresentationBottomBarProps) {
  return (
        <div
    className={`relative z-20 pb-4 sm:pb-6 flex justify-center px-4 transition-opacity duration-300 ${
      controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-md">
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrev}
        disabled={currentSlideIndex === 0}
        className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
        title={t("Vorige dia")}
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Slide Indicator (Click to open overview) */}
      <button
        type="button"
        onClick={() => onOpenOverview()}
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
        onClick={onNext}
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
          onClick={() => onViewCriteria()}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            criteriaOpen
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
          onClick={() => onEdit()}
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
          onClick={() => onToggleNotes()}
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
  );
}
