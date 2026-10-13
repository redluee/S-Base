"use client";

import { t } from "@/lib/lang";
import {
  X,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";

export function BackgroundSettingsPanel({
  blur,
  setBlur,
  brightness,
  setBrightness,
  bgImage,
  setBgImage,
  resetDefaults,
  handleFileUpload,
  onClose,
}: {
  blur: number;
  setBlur: (value: number) => void;
  brightness: number;
  setBrightness: (value: number) => void;
  bgImage: string;
  setBgImage: (value: string) => void;
  resetDefaults: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}) {
  return (
      <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 squircle-card bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-5 text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="size-4.5 text-[#00E676]" />
            <h3 className="font-semibold text-base text-zinc-100">
              {t("Background Settings")}
            </h3>
          </div>
          <button
            onClick={() => onClose()}
            className="p-1 squircle-action text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>
  
        <div className="space-y-5 text-xs">
          {/* Blur Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-medium">
              <span className="text-zinc-300">{t("Blur")}</span>
              <span className="text-[#00E676] font-mono font-bold">{blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              className="w-full accent-[#00E676] bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0px</span>
              <span>25px</span>
              <span>50px</span>
            </div>
          </div>
  
          {/* Brightness Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-medium">
              <span className="text-zinc-300">{t("Brightness")}</span>
              <span className="text-[#00E676] font-mono font-bold">{brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-[#00E676] bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
  
          {/* Background Image Selection */}
          <div>
            <label className="block mb-2 font-medium text-zinc-300">
              {t("Background Image")}
            </label>
  
            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setBgImage("/karp-350.jpg")}
                className={`flex items-center justify-center gap-2 p-2.5 squircle-icon border text-xs font-semibold transition-all ${
                  bgImage === "/karp-350.jpg"
                    ? "bg-[#00E676]/15 border-[#00E676] text-[#00E676]"
                    : "bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <ImageIcon className="size-3.5" />
                <span>Karp 350</span>
              </button>
              <button
                type="button"
                onClick={() => setBgImage("none")}
                className={`flex items-center justify-center gap-2 p-2.5 squircle-icon border text-xs font-semibold transition-all ${
                  bgImage === "none"
                    ? "bg-[#00E676]/15 border-[#00E676] text-[#00E676]"
                    : "bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <span>{t("Dark")}</span>
              </button>
            </div>
  
            {/* Custom Image Upload */}
            <div>
              <label className="flex items-center justify-center gap-2 w-full p-2.5 squircle-icon border border-dashed border-zinc-700 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-300 hover:text-white cursor-pointer transition-all">
                <Upload className="size-3.5 text-zinc-400" />
                <span className="font-medium text-xs">{t("Upload Image")}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
  
          {/* Reset Defaults Button */}
          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={resetDefaults}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              <span>{t("Reset to Default")}</span>
            </button>
          </div>
        </div>
      </div>
  );
}
