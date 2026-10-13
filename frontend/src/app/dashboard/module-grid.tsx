"use client";

import Link from "next/link";
import { t } from "@/lib/lang";
import { DumbbellIcon } from "@/components/icons";
import {
  ChefHat,
  Music,
  Heart,
  Gamepad2,
  GraduationCap,
  ArrowUpRight,
  FileUser,
} from "lucide-react";

export function ModuleGrid({
  canAccess,
  hasOnlineServer,
  cashflowOnlyInPair,
  resumeOnlyInPair,
}: {
  canAccess: (moduleId: string) => boolean;
  hasOnlineServer: boolean;
  cashflowOnlyInPair: boolean;
  resumeOnlyInPair: boolean;
}) {
  return (
    <nav className="grid grid-cols-1 sm:grid-cols-6 gap-4 sm:gap-5 w-full max-w-3xl mb-8 relative z-10">
      {/* 1. Workout Studio Card */}
      {canAccess("workout") && (
        <Link
          href="/workouts"
          className="group relative col-span-1 sm:col-span-6 flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#00E676]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(0,230,118,0.35)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00E676]/10 via-transparent to-[#00E676]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,230,118,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(0,230,118,0.6)] transition-all duration-300">
              <DumbbellIcon className="size-5 anim-dumbbell" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                {t("Workout Studio")}
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Kracht & conditie")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] group-hover:bg-[#00E676] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 2. Taste Tracker Card */}
      {canAccess("recipes") && (
        <Link
          href="/recipes"
          className="group relative col-span-1 sm:col-span-3 flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FFB300]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,179,0,0.35)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFB300]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#FFB300]/15 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,179,0,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,179,0,0.6)] transition-all duration-300 relative overflow-visible">
              <ChefHat className="size-5 anim-hat" />
              <svg
                className="absolute size-5 anim-tomato opacity-0 pointer-events-none"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 5 C12 5 11 2 8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 5 C12 5 13 2 16 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 7 C12 6 12 5 12 4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="14" r="7" fill="#ef4444" />
                <ellipse cx="9.5" cy="11.5" rx="1.8" ry="1.2" fill="rgba(255,255,255,0.25)" transform="rotate(-20 9.5 11.5)" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                {t("Taste Tracker")}
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Recipes & Wines")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#FFB300]/15 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300] group-hover:bg-[#FFB300] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 3. Lobby Control Card */}
      {canAccess("minecraft") && (
        <Link
          href="/games/minecraft"
          className="group relative col-span-1 sm:col-span-3 flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#76FF03]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(118,255,3,0.35)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#76FF03]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#76FF03]/15 border border-[#76FF03]/30 flex items-center justify-center text-[#76FF03] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(118,255,3,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(118,255,3,0.6)] transition-all duration-300">
              <Gamepad2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  {t("Lobby Control")}
                </h2>
                {hasOnlineServer && (
                  <span className="size-1.5 rounded-full bg-[#76FF03] animate-pulse" />
                )}
              </div>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Game servers")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#76FF03]/15 border border-[#76FF03]/30 flex items-center justify-center text-[#76FF03] group-hover:bg-[#76FF03] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 4. Cashflow Card */}
      {canAccess("cashflow") && (
        <Link
          href="/cashflow"
          className={`group relative col-span-1 ${
            cashflowOnlyInPair ? "sm:col-span-6" : "sm:col-span-4"
          } flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#00B0FF]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(0,176,255,0.35)] overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00B0FF]/10 via-transparent to-[#00B0FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#00B0FF]/15 border border-[#00B0FF]/30 flex items-center justify-center text-[#00B0FF] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,176,255,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(0,176,255,0.6)] transition-all duration-300 relative overflow-visible">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 overflow-visible"
                aria-hidden="true"
              >
                <g className="anim-bill-back text-[#00B0FF]/70">
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </g>
                <g className="anim-bill-front">
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </g>
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                {t("Cashflow")}
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Facturatie & financieel overzicht")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#00B0FF]/15 border border-[#00B0FF]/30 flex items-center justify-center text-[#00B0FF] group-hover:bg-[#00B0FF] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 5b. Resume Card */}
      {canAccess("resume") && (
        <Link
          href="/resume"
          className={`group relative col-span-1 ${
            resumeOnlyInPair ? "sm:col-span-6" : "sm:col-span-2"
          } flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#E040FB]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(224,64,251,0.35)] overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#E040FB]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#E040FB]/15 border border-[#E040FB]/30 flex items-center justify-center text-[#E040FB] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(224,64,251,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(224,64,251,0.6)] transition-all duration-300">
              <FileUser className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                {t("CV Builder")}
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Resume & PDF")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#E040FB]/15 border border-[#E040FB]/30 flex items-center justify-center text-[#E040FB] group-hover:bg-[#E040FB] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 5. Minor Card */}
      {canAccess("minor") && (
        <Link
          href="/minor"
          className="group relative col-span-1 sm:col-span-3 flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF9100]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,145,0,0.35)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9100]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#FF9100]/15 border border-[#FF9100]/30 flex items-center justify-center text-[#FF9100] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,145,0,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,145,0,0.6)] transition-all duration-300">
              <GraduationCap className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                {t("Minor")}
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Sprints & Log")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#FF9100]/15 border border-[#FF9100]/30 flex items-center justify-center text-[#FF9100] group-hover:bg-[#FF9100] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      )}
  
      {/* 6. Lyric Quotes & You (Side-by-side compact partner tiles in 1 column) */}
      {(canAccess("lyric_quotes") || canAccess("you")) && (
        <div
          className={`col-span-1 sm:col-span-3 grid gap-2.5 sm:gap-3 ${
            canAccess("lyric_quotes") && canAccess("you") ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {/* Lyric Quotes Card (Soft Purple #7C4DFF) */}
          {canAccess("lyric_quotes") && (
            <a
              href="https://stevenheijn.nl/lyric_quotes/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#7C4DFF]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(124,77,255,0.35)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C4DFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="size-9 squircle-icon bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 flex items-center justify-center text-[#7C4DFF] shadow-[0_0_12px_rgba(124,77,255,0.3)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                  <Music className="size-4" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-1 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♪</span>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-2 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♫</span>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-3 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♩</span>
                </div>
                <ArrowUpRight className="size-3.5 text-[#7C4DFF] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
  
              <div className="relative z-10 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  {t("Lyric Quotes")}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium truncate">Quotes</p>
              </div>
            </a>
          )}
  
          {/* You Card (Crimson / Rose #FF4081) */}
          {canAccess("you") && (
            <a
              href="https://stevenheijn.nl/you"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF4081]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,64,129,0.35)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF4081]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="size-9 squircle-icon bg-[#FF4081]/15 border border-[#FF4081]/30 flex items-center justify-center text-[#FF4081] shadow-[0_0_12px_rgba(255,64,129,0.3)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                  <Heart className="size-4" />
                  <Heart className="absolute size-2 text-[#FF4081]/70 anim-heart-1 opacity-0 pointer-events-none" aria-hidden="true" />
                  <Heart className="absolute size-2 text-[#FF4081] anim-heart-2 opacity-0 pointer-events-none" aria-hidden="true" />
                  <Heart className="absolute size-2.5 text-[#FF4081] anim-heart-3 opacity-0 pointer-events-none" aria-hidden="true" />
                </div>
                <ArrowUpRight className="size-3.5 text-[#FF4081] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
  
              <div className="relative z-10 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  {t("You")}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium truncate">{t("Persoonlijk")}</p>
              </div>
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
