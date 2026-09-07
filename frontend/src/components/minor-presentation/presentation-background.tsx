"use client";

import { useMemo } from "react";

interface PresentationBackgroundProps {
  accentColor?: string;
  storyTypeCode?: string;
  slideIndex?: number;
}

interface GradientPosition {
  top: string;
  left: string;
  size: string;
  opacity: number;
}

interface StoryTypePreset {
  grad1: GradientPosition;
  grad2: GradientPosition;
}

// Predefined coordinate presets per story type so each type has a distinct spatial anchor
const PRESETS: StoryTypePreset[] = [
  // 0: INTRO / Default (Signal Green) - Top-Left & Bottom-Right
  {
    grad1: { top: "18%", left: "18%", size: "680px", opacity: 0.44 },
    grad2: { top: "76%", left: "80%", size: "720px", opacity: 0.36 },
  },
  // 1: US (User Story - Emerald) - Top-Right & Bottom-Left
  {
    grad1: { top: "16%", left: "82%", size: "700px", opacity: 0.48 },
    grad2: { top: "78%", left: "16%", size: "640px", opacity: 0.38 },
  },
  // 2: RS (Research Story - Orange) - Bottom-Right & Top-Center-Left
  {
    grad1: { top: "74%", left: "78%", size: "720px", opacity: 0.46 },
    grad2: { top: "20%", left: "28%", size: "620px", opacity: 0.38 },
  },
  // 3: LS (Learning Story - Purple) - Center-Right & Top-Left
  {
    grad1: { top: "45%", left: "86%", size: "680px", opacity: 0.48 },
    grad2: { top: "15%", left: "14%", size: "620px", opacity: 0.38 },
  },
  // 4: BUG / FIX (Rose / Red) - Bottom-Center & Top-Right
  {
    grad1: { top: "80%", left: "48%", size: "700px", opacity: 0.48 },
    grad2: { top: "15%", left: "70%", size: "620px", opacity: 0.38 },
  },
  // 5: TECH / SPIKE (Blue / Cyan) - Center-Left & Top-Right
  {
    grad1: { top: "50%", left: "12%", size: "660px", opacity: 0.45 },
    grad2: { top: "18%", left: "76%", size: "720px", opacity: 0.38 },
  },
  // 6: OUTRO - Bottom-Left & Mid-Top-Right
  {
    grad1: { top: "68%", left: "24%", size: "680px", opacity: 0.46 },
    grad2: { top: "26%", left: "76%", size: "700px", opacity: 0.36 },
  },
  // 7: Custom / Fallback - Top-Center & Bottom-Right
  {
    grad1: { top: "16%", left: "50%", size: "680px", opacity: 0.46 },
    grad2: { top: "76%", left: "82%", size: "680px", opacity: 0.36 },
  },
];

function getPresetForType(typeCode?: string): StoryTypePreset {
  const code = (typeCode || "INTRO").trim().toUpperCase();
  if (code === "INTRO") return PRESETS[0];
  if (code === "US") return PRESETS[1];
  if (code === "RS") return PRESETS[2];
  if (code === "LS") return PRESETS[3];
  if (code === "BUG" || code === "FIX") return PRESETS[4];
  if (code === "TECH" || code === "SPIKE") return PRESETS[5];
  if (code === "OUTRO") return PRESETS[6];

  // Deterministic distribution for any custom story type
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) % PRESETS.length;
  }
  const index = 1 + (Math.abs(hash) % (PRESETS.length - 1));
  return PRESETS[index];
}

function parseHexColor(color: string): { r: number; g: number; b: number } {
  if (!color) return { r: 0, g: 227, b: 164 };
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.replace("#", "");
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  } else if (trimmed.startsWith("rgb")) {
    const match = trimmed.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
      };
    }
  }
  return { r: 0, g: 227, b: 164 };
}

export function PresentationBackground({
  accentColor = "#00e3a4",
  storyTypeCode,
}: PresentationBackgroundProps) {
  const { r, g, b } = useMemo(() => parseHexColor(accentColor), [accentColor]);
  const preset = useMemo(() => getPresetForType(storyTypeCode), [storyTypeCode]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes dynamicGradientFloat1 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(calc(-50% + 24px), calc(-50% - 20px)) scale(1.06);
          }
        }
        @keyframes dynamicGradientFloat2 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1.04);
          }
          50% {
            transform: translate(calc(-50% - 22px), calc(-50% + 22px)) scale(0.96);
          }
        }
      `}</style>

      {/* Deep pitch black background */}
      <div className="absolute inset-0 bg-black" />

      {/* Dynamic Circular Gradient 1 */}
      <div
        className="absolute rounded-full will-change-[top,left]"
        style={{
          top: preset.grad1.top,
          left: preset.grad1.left,
          width: preset.grad1.size,
          height: preset.grad1.size,
          transition:
            "top 1400ms cubic-bezier(0.16, 1, 0.3, 1), left 1400ms cubic-bezier(0.16, 1, 0.3, 1), width 1200ms ease, height 1200ms ease",
        }}
      >
        <div
          className="w-full h-full rounded-full relative"
          style={{
            animation: "dynamicGradientFloat1 14s ease-in-out infinite",
            backgroundColor: `rgba(${r}, ${g}, ${b}, ${preset.grad1.opacity})`,
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.82) 32%, rgba(0, 0, 0, 0.35) 60%, transparent 80%)",
            maskImage:
              "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.82) 32%, rgba(0, 0, 0, 0.35) 60%, transparent 80%)",
            filter: "blur(36px)",
            transition: "background-color 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Radiant center hotspot */}
          <div
            className="absolute inset-[22%] rounded-full"
            style={{
              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.40)`,
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 75%)",
              maskImage:
                "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 75%)",
              filter: "blur(22px)",
              transition: "background-color 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>

      {/* Dynamic Circular Gradient 2 */}
      <div
        className="absolute rounded-full will-change-[top,left]"
        style={{
          top: preset.grad2.top,
          left: preset.grad2.left,
          width: preset.grad2.size,
          height: preset.grad2.size,
          transition:
            "top 1400ms cubic-bezier(0.16, 1, 0.3, 1), left 1400ms cubic-bezier(0.16, 1, 0.3, 1), width 1200ms ease, height 1200ms ease",
        }}
      >
        <div
          className="w-full h-full rounded-full relative"
          style={{
            animation: "dynamicGradientFloat2 18s ease-in-out infinite",
            backgroundColor: `rgba(${r}, ${g}, ${b}, ${preset.grad2.opacity})`,
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.8) 32%, rgba(0, 0, 0, 0.35) 60%, transparent 80%)",
            maskImage:
              "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.8) 32%, rgba(0, 0, 0, 0.35) 60%, transparent 80%)",
            filter: "blur(40px)",
            transition: "background-color 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Radiant center hotspot */}
          <div
            className="absolute inset-[24%] rounded-full"
            style={{
              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.32)`,
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 75%)",
              maskImage:
                "radial-gradient(circle at 50% 50%, black 0%, rgba(0, 0, 0, 0.6) 40%, transparent 75%)",
              filter: "blur(24px)",
              transition: "background-color 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>

      {/* Subtle dot matrix grid overlay for a high-tech console texture */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Vignette border fade (softer so corners aren't completely blacked out) */}
      <div className="absolute inset-0 bg-radial-[ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.65)_100%]" />
    </div>
  );
}
