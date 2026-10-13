import { LayoutGrid, X } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull, MinorStory, MinorStoryType } from "@/lib/api";
import { getStoryTypeDetails } from "@/components/minor-story-type-badge";

interface PresentationOverviewProps {
  sprint: MinorSprintFull;
  presentedStories: MinorStory[];
  storyTypes: MinorStoryType[];
  totalSlides: number;
  currentSlideIndex: number;
  goToSlide: (index: number) => void;
  onClose: () => void;
}

export function PresentationOverview({
  sprint,
  presentedStories,
  storyTypes,
  totalSlides,
  currentSlideIndex,
  goToSlide,
  onClose,
}: PresentationOverviewProps) {
  return (
  <div
    className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    onClick={() => onClose()}
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
          onClick={() => onClose()}
          className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
          title={t("Sluiten")}
          aria-label={t("Sluiten")}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
        {/* Slide 0: Intro */}
        <button
          type="button"
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
        </button>

        {/* Story Slides */}
        {presentedStories.map((st, idx) => {
          const slideNum = idx + 1;
          const isCurrent = currentSlideIndex === slideNum;
          const typeDetails = getStoryTypeDetails(st.storyTypeCode, storyTypes);
          const color = typeDetails.color || "#00e3a4";
          return (
            <button
              type="button"
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
            </button>
          );
        })}

        {/* Last Slide: Outro */}
        <button
          type="button"
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
        </button>
      </div>
    </div>
  </div>
  );
}
