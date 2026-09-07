"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { compressImage } from "@/lib/image";
import { api, type AuthUser } from "@/lib/api";
import type { WorkoutSession } from "@backend/types/shared";
import { RunningWorkoutCard } from "@/components/running-workout-card";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import {
  Dumbbell,
  ChefHat,
  Banknote,
  User,
  Music,
  Heart,
  Settings,
  X,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Sliders,
  Activity,
  Gamepad2,
  GraduationCap,
  Shield,
  ArrowUpRight,
} from "lucide-react";

const DEFAULT_BG = "/karp-350.jpg";
const DEFAULT_BLUR = 5;
const DEFAULT_BRIGHTNESS = 80;

interface ModuleDefinition {
  id: string;
  title: string;
  subtitle: string;
  roles: ("user" | "admin")[];
  accentColor: string;
  glowColor: string;
  href: string;
  external?: boolean;
}

const MODULES: ModuleDefinition[] = [
  {
    id: "workout",
    title: "Workout Studio",
    subtitle: "Kracht & conditie",
    roles: ["user", "admin"],
    accentColor: "#00E676",
    glowColor: "rgba(0, 230, 118, 0.35)",
    href: "/workouts",
  },
  {
    id: "cashflow",
    title: "Cashflow",
    subtitle: "Facturatie & financieel overzicht",
    roles: ["user", "admin"],
    accentColor: "#00B0FF",
    glowColor: "rgba(0, 176, 255, 0.35)",
    href: "/cashflow",
  },
  {
    id: "recipes",
    title: "Taste Tracker",
    subtitle: "Recipes & Wines",
    roles: ["user", "admin"],
    accentColor: "#FFB300",
    glowColor: "rgba(255, 179, 0, 0.35)",
    href: "/recipes",
  },
  {
    id: "minecraft",
    title: "Lobby Control",
    subtitle: "Game servers",
    roles: ["user", "admin"],
    accentColor: "#76FF03",
    glowColor: "rgba(118, 255, 3, 0.35)",
    href: "/games/minecraft",
  },
  {
    id: "minor",
    title: "Minor",
    subtitle: "Sprints & Log",
    roles: ["user", "admin"],
    accentColor: "#FF9100",
    glowColor: "rgba(255, 145, 0, 0.35)",
    href: "/minor",
  },
  {
    id: "lyric_quotes",
    title: "Lyric Quotes",
    subtitle: "Quotes",
    roles: ["user", "admin"],
    accentColor: "#7C4DFF",
    glowColor: "rgba(124, 77, 255, 0.35)",
    href: "https://stevenheijn.nl/lyric_quotes/",
    external: true,
  },
  {
    id: "you",
    title: "You",
    subtitle: "Persoonlijk",
    roles: ["user", "admin"],
    accentColor: "#FF4081",
    glowColor: "rgba(255, 64, 129, 0.35)",
    href: "https://stevenheijn.nl/you",
    external: true,
  },
  {
    id: "pulse",
    title: "Pulse",
    subtitle: "Monitoring & beheer",
    roles: ["admin"],
    accentColor: "#FF1744",
    glowColor: "rgba(255, 23, 68, 0.35)",
    href: "/pulse",
  },
];

export function DashboardClient({
  username,
  role,
  user,
  userModules,
  isImpersonated,
  impersonatedBy,
}: {
  username: string;
  role?: "admin" | "user";
  user?: AuthUser;
  userModules?: string[];
  isImpersonated?: boolean;
  impersonatedBy?: string | null;
}) {
  const [blur, setBlur] = useState<number>(DEFAULT_BLUR);
  const [brightness, setBrightness] = useState<number>(DEFAULT_BRIGHTNESS);
  const [bgImage, setBgImage] = useState<string>(DEFAULT_BG);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [runningSession, setRunningSession] = useState<WorkoutSession | null>(null);

  // Determine current active role
  const currentRole: "admin" | "user" =
    role ??
    (user?.role ??
      (userModules?.includes("pulse") || username === "admin" ? "admin" : "user"));

  useEffect(() => {
    api.workouts.sessions
      .list("active")
      .then((sessions) => {
        if (sessions && sessions.length > 0) {
          setRunningSession(sessions[0]);
        }
      })
      .catch(() => {});
  }, []);

  const storageKey = `sbase_dashboard_bg_${username.toLowerCase().trim() || "default"}`;

  const hasModule = (moduleName: string): boolean => {
    if (!Array.isArray(userModules)) return false;
    return userModules.includes(moduleName);
  };

  const canAccess = (moduleId: string): boolean => {
    const mod = MODULES.find((m) => m.id === moduleId);
    if (!mod) return false;
    if (!mod.roles.includes(currentRole)) return false;
    if (moduleId === "minecraft") {
      return hasModule("minecraft") || hasModule("minecraft:monitor");
    }
    return hasModule(moduleId);
  };

  // Load saved background settings from localStorage per user
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    let nextBlur: number | undefined;
    let nextBrightness: number | undefined;
    let nextBgImage: string | undefined;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.blur === "number") nextBlur = parsed.blur;
        if (typeof parsed.brightness === "number") nextBrightness = parsed.brightness;
        if (typeof parsed.bgImage === "string") {
          nextBgImage = parsed.bgImage === "" ? DEFAULT_BG : parsed.bgImage;
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    requestAnimationFrame(() => {
      if (nextBlur !== undefined) setBlur(nextBlur);
      if (nextBrightness !== undefined) setBrightness(nextBrightness);
      if (nextBgImage !== undefined) setBgImage(nextBgImage);
      setIsLoaded(true);
    });
  }, [storageKey]);

  // Save background settings to localStorage per user
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ blur, brightness, bgImage }));
    } catch {
      // Ignore quota error
    }
  }, [blur, brightness, bgImage, isLoaded, storageKey]);

  const resetDefaults = () => {
    setBlur(DEFAULT_BLUR);
    setBrightness(DEFAULT_BRIGHTNESS);
    setBgImage(DEFAULT_BG);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBgImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(compressed);
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen px-4 sm:px-6 pt-20 sm:pt-24 pb-28 relative overflow-x-hidden bg-zinc-950 text-foreground w-full font-sans">
      {/* Impersonation Banner */}
      {isImpersonated && impersonatedBy && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <ImpersonationBanner username={username} impersonatedBy={impersonatedBy} />
        </div>
      )}

      {/* Background Image Container */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105 transition-[filter,background-image] duration-300"
        style={{
          backgroundImage: bgImage && bgImage !== "none" ? `url('${bgImage}')` : "none",
          filter: `blur(${blur}px) brightness(${brightness}%) contrast(1.1)`,
        }}
      />

      {/* Dark Overlay Gradient for maximum contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/50 to-zinc-950/90 pointer-events-none" />

      {/* Background Decorative Radial Glows */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,118,0.06)_0%,_transparent_70%)] pointer-events-none" />
      <div className="fixed -top-40 -left-40 size-96 bg-[#00E676]/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="fixed -top-40 -right-40 size-96 bg-[#00B0FF]/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="fixed -bottom-40 -left-40 size-96 bg-[#76FF03]/8 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 size-96 bg-[#FF9100]/8 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header
        className={`absolute ${
          isImpersonated ? "top-14" : "top-6"
        } right-4 sm:right-6 z-30 flex items-center gap-2 p-1.5 px-3 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-[16px] shadow-lg`}
      >
        <div className="size-6 sm:size-7 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.3)]">
          <User className="size-3.5 sm:size-4" />
        </div>
        <span className="text-xs font-semibold text-zinc-200 tracking-wide">{username}</span>
      </header>

      {/* Title Section */}
      <section className="text-center mb-8 sm:mb-12 max-w-xl relative z-10 w-full px-2">
        <h1
          className="font-display text-[clamp(2.25rem,6vw+1rem,4.5rem)] leading-none mb-3 select-none font-black tracking-tight drop-shadow-xl"
          style={{ textShadow: "0 0 3rem rgba(0,230,118,0.25)" }}
        >
          {t("Welcome to")} <span className="text-[#00E676]">S</span>-Base
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium">
          {t("Built for personal use and development")}
        </p>
      </section>

      {/* Active Status Banner (Elevated Glowing Pill) */}
      {runningSession && (
        <div className="w-full max-w-3xl mb-6 relative z-20 animate-in fade-in slide-in-from-top-3 duration-300">
          <RunningWorkoutCard
            session={runningSession}
            compact
            onDiscard={() => setRunningSession(null)}
          />
        </div>
      )}

      {/* Module Grid Hierarchy (Asymmetric Bento Grid) */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full max-w-3xl mb-8 relative z-10">
        {/* 1. Workout Studio Card (Large 2-column wide, Neon Green #00E676) */}
        {canAccess("workout") && (
          <Link
            href="/workouts"
            className="group relative col-span-1 sm:col-span-2 flex items-center justify-between p-5 sm:p-6 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#00E676]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(0,230,118,0.35)] overflow-hidden"
          >
            {/* Ambient hover glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#00E676]/10 via-transparent to-[#00E676]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 min-w-0">
              <div className="size-12 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,230,118,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(0,230,118,0.6)] transition-all duration-300">
                <Dumbbell className="size-6 anim-dumbbell rotate-90" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg sm:text-xl text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  {t("Workout Studio")}
                </h2>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">
                  {t("Kracht & conditie")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#00E676] uppercase tracking-wider relative z-10 shrink-0 ml-3">
              <span className="hidden sm:inline bg-[#00E676]/10 border border-[#00E676]/20 px-2.5 py-1 rounded-lg">
                {t("Sessie starten")}
              </span>
              <div className="size-8 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center group-hover:bg-[#00E676] group-hover:text-zinc-950 transition-all duration-200">
                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </Link>
        )}

        {/* 2. Taste Tracker Card (Standard 1-column tile, Amber #FFB300) */}
        {canAccess("recipes") && (
          <Link
            href="/recipes"
            className="group relative col-span-1 flex items-center justify-between p-4.5 sm:p-5 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FFB300]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,179,0,0.35)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFB300]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10 min-w-0">
              <div className="size-11 rounded-2xl bg-[#FFB300]/15 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,179,0,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,179,0,0.6)] transition-all duration-300 relative overflow-visible">
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

            <div className="size-7 rounded-full bg-[#FFB300]/15 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300] group-hover:bg-[#FFB300] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-2">
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        )}

        {/* 3. Lobby Control Card (Standard 1-column tile, Lime Green #76FF03) */}
        {canAccess("minecraft") && (
          <Link
            href="/games/minecraft"
            className="group relative col-span-1 flex items-center justify-between p-4.5 sm:p-5 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#76FF03]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(118,255,3,0.35)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#76FF03]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10 min-w-0">
              <div className="size-11 rounded-2xl bg-[#76FF03]/15 border border-[#76FF03]/30 flex items-center justify-center text-[#76FF03] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(118,255,3,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(118,255,3,0.6)] transition-all duration-300">
                <Gamepad2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                    {t("Lobby Control")}
                  </h2>
                  <span className="size-1.5 rounded-full bg-[#76FF03] animate-pulse" />
                </div>
                <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                  {t("Game servers")}
                </p>
              </div>
            </div>

            <div className="size-7 rounded-full bg-[#76FF03]/15 border border-[#76FF03]/30 flex items-center justify-center text-[#76FF03] group-hover:bg-[#76FF03] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-2">
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        )}

        {/* 4. Cashflow Card (Large 2-column wide, Cyan / Electric Blue #00B0FF) */}
        {canAccess("cashflow") && (
          <Link
            href="/cashflow"
            className="group relative col-span-1 sm:col-span-2 flex items-center justify-between p-5 sm:p-6 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#00B0FF]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(0,176,255,0.35)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00B0FF]/10 via-transparent to-[#00B0FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 min-w-0">
              <div className="size-12 rounded-2xl bg-[#00B0FF]/15 border border-[#00B0FF]/30 flex items-center justify-center text-[#00B0FF] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,176,255,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(0,176,255,0.6)] transition-all duration-300 relative overflow-visible">
                <Banknote className="size-5 absolute anim-bill-back opacity-0 text-[#00B0FF]/70" aria-hidden="true" />
                <Banknote className="size-5.5 relative anim-bill-front" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg sm:text-xl text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  {t("Cashflow")}
                </h2>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">
                  {t("Facturatie & financieel overzicht")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#00B0FF] uppercase tracking-wider relative z-10 shrink-0 ml-3">
              <span className="hidden sm:inline bg-[#00B0FF]/10 border border-[#00B0FF]/20 px-2.5 py-1 rounded-lg">
                {t("Facturatie")}
              </span>
              <div className="size-8 rounded-full bg-[#00B0FF]/15 border border-[#00B0FF]/30 flex items-center justify-center group-hover:bg-[#00B0FF] group-hover:text-zinc-950 transition-all duration-200">
                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </Link>
        )}

        {/* 5. Minor Card (Standard 1-column tile, Orange #FF9100) */}
        {canAccess("minor") && (
          <Link
            href="/minor"
            className="group relative col-span-1 flex items-center justify-between p-4.5 sm:p-5 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF9100]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,145,0,0.35)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF9100]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10 min-w-0">
              <div className="size-11 rounded-2xl bg-[#FF9100]/15 border border-[#FF9100]/30 flex items-center justify-center text-[#FF9100] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,145,0,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,145,0,0.6)] transition-all duration-300">
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

            <div className="size-7 rounded-full bg-[#FF9100]/15 border border-[#FF9100]/30 flex items-center justify-center text-[#FF9100] group-hover:bg-[#FF9100] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-2">
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        )}

        {/* 6. Lyric Quotes & You (Side-by-side compact partner tiles in 1 column) */}
        {(canAccess("lyric_quotes") || canAccess("you")) && (
          <div
            className={`col-span-1 grid gap-2.5 sm:gap-3 ${
              canAccess("lyric_quotes") && canAccess("you") ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Lyric Quotes Card (Soft Purple #7C4DFF) */}
            {canAccess("lyric_quotes") && (
              <a
                href="https://stevenheijn.nl/lyric_quotes/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#7C4DFF]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(124,77,255,0.35)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#7C4DFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="size-9 rounded-xl bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 flex items-center justify-center text-[#7C4DFF] shadow-[0_0_12px_rgba(124,77,255,0.3)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
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
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF4081]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,64,129,0.35)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF4081]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="size-9 rounded-xl bg-[#FF4081]/15 border border-[#FF4081]/30 flex items-center justify-center text-[#FF4081] shadow-[0_0_12px_rgba(255,64,129,0.3)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
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

      {/* Admin Section (Role-Gated for user.role === 'admin') */}
      {currentRole === "admin" && canAccess("pulse") && (
        <section className="w-full max-w-3xl relative z-10 mb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shield className="size-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t("System / Beheer")}
            </span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          <Link
            href="/pulse"
            className="group relative flex items-center justify-between p-4.5 sm:p-5 rounded-[20px] bg-white/[0.05] backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF1744]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,23,68,0.35)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF1744]/10 via-transparent to-[#FF1744]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10 min-w-0">
              <div className="size-11 rounded-2xl bg-[#FF1744]/15 border border-[#FF1744]/30 flex items-center justify-center text-[#FF1744] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,23,68,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,23,68,0.6)] transition-all duration-300 relative overflow-visible">
                <Activity className="size-5" />
                <svg
                  viewBox="0 0 60 20"
                  className="absolute inset-0 w-full h-full p-1.5 pointer-events-none"
                  aria-hidden="true"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline
                    className="anim-ekg"
                    points="0,10 10,10 14,2 18,18 22,2 26,18 30,10 40,10 42,6 44,14 46,10 60,10"
                    stroke="rgba(255,23,68,0.95)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="120"
                    strokeDashoffset="120"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                    Pulse
                  </h2>
                  <span className="text-[10px] font-semibold text-[#FF1744] bg-[#FF1744]/15 border border-[#FF1744]/30 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">
                  {t("Monitoring")} &middot; {t("Systeembeheer")}
                </p>
              </div>
            </div>

            <div className="size-8 rounded-full bg-[#FF1744]/15 border border-[#FF1744]/30 flex items-center justify-center text-[#FF1744] group-hover:bg-[#FF1744] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        </section>
      )}

      {/* Settings Toggle Button (Bottom Right) */}
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:border-[#00E676]/40 hover:bg-zinc-800/90 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#00E676]/40"
        title={t("Background Settings")}
        aria-label={t("Background Settings")}
      >
        <Settings
          className={`size-5 transition-transform duration-500 ${
            isSettingsOpen ? "rotate-90 text-[#00E676]" : "group-hover:rotate-90"
          }`}
        />
      </button>

      {/* Settings Menu Panel */}
      {isSettingsOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 rounded-[20px] bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-5 text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sliders className="size-4.5 text-[#00E676]" />
              <h3 className="font-semibold text-base text-zinc-100">
                {t("Background Settings")}
              </h3>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
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
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
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
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
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
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
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
                <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-300 hover:text-white cursor-pointer transition-all">
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
      )}
    </main>
  );
}
