"use client";

import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from "lucide-react";
import { t } from "@/lib/lang";

interface PresentationLightboxProps {
  image: { url: string; caption?: string } | null;
  onClose: () => void;
}

export function PresentationLightbox({ image, onClose }: PresentationLightboxProps) {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.35, 3));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.35, 0.75));
  }

  function resetZoom() {
    setScale(1);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Lightbox Toolbar */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-zinc-900/90 border border-white/10 rounded-xl p-1.5 shadow-xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={zoomIn}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={t("Inzoomen")}
          aria-label={t("Inzoomen")}
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={t("Uitzoomen")}
          aria-label={t("Uitzoomen")}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={t("Herstel zoom")}
          aria-label={t("Herstel zoom")}
        >
          <RotateCcw className="size-4" />
        </button>
        <a
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={t("Openen in nieuw tabblad")}
          aria-label={t("Openen in nieuw tabblad")}
        >
          <ExternalLink className="size-4" />
        </a>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={t("Sluiten")}
          aria-label={t("Sluiten")}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Image Container */}
      <div
        className="max-w-[92vw] max-h-[86vh] flex flex-col items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-auto max-h-[78vh] flex items-center justify-center p-2 rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption || "Screenshot"}
            style={{ transform: `scale(${scale})`, transition: "transform 0.15s ease-out" }}
            className="max-h-[76vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10 cursor-zoom-in"
            onClick={() => setScale((s) => (s > 1 ? 1 : 1.6))}
          />
        </div>

        {image.caption && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-zinc-300 text-center max-w-2xl shadow-lg">
            {image.caption}
          </div>
        )}
      </div>
    </div>
  );
}
