import { Maximize2, Minimize2, X, LayoutGrid } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull } from "@/lib/api";

interface PresentationTopBarProps {
  sprint: MinorSprintFull;
  controlsVisible: boolean;
  isFullscreen: boolean;
  onOpenOverview: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export function PresentationTopBar({
  sprint,
  controlsVisible,
  isFullscreen,
  onOpenOverview,
  onToggleFullscreen,
  onClose,
}: PresentationTopBarProps) {
  return (
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
        onClick={() => onOpenOverview()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
        title={t("Miniaturen & Overzicht")}
      >
        <LayoutGrid className="size-3.5" />
        <span className="hidden sm:inline">{t("Overzicht")}</span>
      </button>

      <button
        type="button"
        onClick={onToggleFullscreen}
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
  );
}
