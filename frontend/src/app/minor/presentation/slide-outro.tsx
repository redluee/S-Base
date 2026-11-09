"use client";

import { MessageSquare } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull, MinorStory } from "@/lib/api";

interface SlideOutroProps {
  sprint?: MinorSprintFull;
  stories?: MinorStory[];
  onRestart?: () => void;
  onClose?: () => void;
}

export function SlideOutro({}: SlideOutroProps = {}) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-center items-center min-h-[72vh] px-4 sm:px-8 py-6 text-center animate-in fade-in duration-300">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand mb-6 shadow-[0_0_2rem_rgba(0,227,164,0.2)]">
        <MessageSquare className="size-8" />
      </div>

      {/* Outro Title */}
      <h2 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight mb-3">
        {t("Vragen & Feedback")}
      </h2>
    </div>
  );
}
