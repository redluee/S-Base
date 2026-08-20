"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { compressImage } from "@/lib/image";
import { api } from "@/lib/api";
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
} from "lucide-react";

const DEFAULT_BG = "/karp-350.jpg";
const DEFAULT_BLUR = 5;
const DEFAULT_BRIGHTNESS = 80;

export function DashboardClient({
  username,
  userModules,
  isImpersonated,
  impersonatedBy,
}: {
  username: string;
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

  useEffect(() => {
    api.workouts.sessions.list("active").then((sessions) => {
      if (sessions && sessions.length > 0) {
        setRunningSession(sessions[0]);
      }
    }).catch(() => {});
  }, []);

  const storageKey = `sbase_dashboard_bg_${username.toLowerCase().trim() || "default"}`;

  const hasModule = (moduleName: string): boolean => {
    if (!Array.isArray(userModules)) return false;
    return userModules.includes(moduleName);
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
      localStorage.setItem(
        storageKey,
        JSON.stringify({ blur, brightness, bgImage })
      );
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
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden bg-zinc-950 text-foreground w-full">
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
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/40 to-zinc-950/80 pointer-events-none" />

      {/* Background Decorative Radial Glows */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,227,164,0.08)_0%,_transparent_70%)] pointer-events-none" />
      <div className="fixed -top-40 -left-40 size-96 bg-brand/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 size-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Account Circle Header */}
      <header className={`absolute ${isImpersonated ? "top-14" : "top-6"} right-6 z-30 flex items-center gap-2 p-1.5 px-3 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-md`}>
        <div className="size-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
          <User className="size-4" />
        </div>
        <span className="text-xs font-semibold text-zinc-300 inline">{username}</span>
      </header>

      {/* Main Title Section */}
      <section className="text-center mb-16 max-w-xl relative z-10">
        <h1
          className="font-display text-[clamp(2.25rem,6vw+1rem,5rem)] leading-none mb-4 select-none font-black tracking-tight whitespace-nowrap drop-shadow-lg"
          style={{ textShadow: "0 0 3rem rgba(0,227,164,0.2)" }}
        >
          {t("Welcome to")} <span className="text-brand">S</span>-Base
        </h1>
        <p className="text-sm sm:text-base text-zinc-300 font-medium drop-shadow">
          {t("Built for personal use and development")}
        </p>
      </section>

      {/* Running Workout Banner */}
      {runningSession && (
        <div className="w-full max-w-3xl mb-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <RunningWorkoutCard session={runningSession} compact onDiscard={() => setRunningSession(null)} />
        </div>
      )}

      {/* Cards Grid */}
      <nav className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl mb-16 relative z-10">
        {/* Workout Studio Card */}
        {hasModule("workout") && (
          <Link
            href="/workouts"
            className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-teal-950/40 via-zinc-900/80 to-emerald-950/30 backdrop-blur-md border border-white/10 hover:border-brand/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(0,227,164,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="size-11 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,227,164,0.4)] group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <Dumbbell className="size-5 anim-dumbbell rotate-90" />
              </div>
              <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-brand transition-colors">
                {t("Workout Studio")}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <span>{t("Start training")}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </Link>
        )}

        {/* Taste Tracker Card */}
        {hasModule("recipes") && (
          <Link
            href="/recipes"
            className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-orange-950/30 backdrop-blur-md border border-white/10 hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(245,158,11,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="size-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                <ChefHat className="size-5 anim-hat" />
                {/* Tomato SVG icon revealed under hat */}
                <svg className="absolute size-5 anim-tomato opacity-0 pointer-events-none" aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5 C12 5 11 2 8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 5 C12 5 13 2 16 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 7 C12 6 12 5 12 4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="14" r="7" fill="#ef4444"/>
                  <ellipse cx="9.5" cy="11.5" rx="1.8" ry="1.2" fill="rgba(255,255,255,0.25)" transform="rotate(-20 9.5 11.5)"/>
                </svg>
              </div>
              <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-amber-400 transition-colors">
                {t("Taste tracker")}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <span>{t("Recipes and wines")}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </Link>
        )}

        {/* Cashflow Card */}
        {hasModule("cashflow") && (
          <Link
            href="/cashflow"
            className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-cyan-950/30 backdrop-blur-md border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(59,130,246,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="size-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                {/* Back bill — hidden until hover */}
                <Banknote className="size-4.5 absolute anim-bill-back opacity-0 text-blue-300" aria-hidden="true" />
                {/* Front bill */}
                <Banknote className="size-5 relative anim-bill-front" />
              </div>
              <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-blue-400 transition-colors">
                {t("Cashflow")}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <span>{t("Facturatie")}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </Link>
        )}

        {/* Combined Lyric Quotes & You Modules Card */}
        {(hasModule("lyric_quotes") || hasModule("you")) && (
          <div
            className={`grid gap-2.5 sm:gap-3 ${
              hasModule("lyric_quotes") && hasModule("you")
                ? "grid-cols-[1.5fr_1fr]"
                : "grid-cols-1"
            }`}
          >
            {/* Lyric Quotes Card */}
            {hasModule("lyric_quotes") && (
              <a
                href="https://stevenheijn.nl/lyric_quotes/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-row items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-purple-950/30 backdrop-blur-md border border-white/10 hover:border-violet-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(139,92,246,0.25)] h-full min-w-0"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="flex items-center gap-2 sm:gap-3 relative z-10 min-w-0">
                  <div className="size-8 sm:size-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(139,92,246,0.4)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                    <Music className="size-4 sm:size-5" />
                    {/* Dancing music notes */}
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-1 opacity-0 pointer-events-none select-none" aria-hidden="true">♪</span>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-2 opacity-0 pointer-events-none select-none" aria-hidden="true">♫</span>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-3 opacity-0 pointer-events-none select-none" aria-hidden="true">♩</span>
                  </div>
                  <h2 className="font-display font-black text-sm sm:text-lg text-zinc-100 tracking-tight group-hover:text-violet-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    {t("Lyric Quotes")}
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </a>
            )}

            {/* Voor Jou Card */}
            {hasModule("you") && (
              <a
                href="https://stevenheijn.nl/you"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-row items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-zinc-900/80 to-pink-950/30 backdrop-blur-md border border-white/10 hover:border-rose-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(244,63,94,0.25)] h-full min-w-0"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="flex items-center gap-2 sm:gap-3 relative z-10 min-w-0">
                  <div className="size-8 sm:size-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(244,63,94,0.4)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                    <Heart className="size-4 sm:size-5" />
                    {/* Floating hearts */}
                    <Heart className="absolute size-2.5 text-rose-300 anim-heart-1 opacity-0 pointer-events-none" aria-hidden="true" />
                    <Heart className="absolute size-2 text-pink-400 anim-heart-2 opacity-0 pointer-events-none" aria-hidden="true" />
                    <Heart className="absolute size-3 text-rose-500 anim-heart-3 opacity-0 pointer-events-none" aria-hidden="true" />
                  </div>
                  <h2 className="font-display font-black text-sm sm:text-lg text-zinc-100 tracking-tight group-hover:text-rose-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    {t("You")}
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-rose-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Pulse Card */}
        {hasModule("pulse") && (
          <Link
            href="/pulse"
            className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-900/80 to-rose-950/30 backdrop-blur-md border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(239,68,68,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="size-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(239,68,68,0.4)] group-hover:scale-110 transition-transform duration-300 relative overflow-visible">
                <Activity className="size-5" />
                {/* EKG heartrate SVG overlay */}
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
                    stroke="rgba(239,68,68,0.9)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="120"
                    strokeDashoffset="120"
                  />
                </svg>
              </div>
              <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-red-400 transition-colors">
                Pulse
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <span>{t("Monitoring")}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </Link>
        )}

        {hasModule("minecraft") && (
          <Link
            href="/games/minecraft"
            className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-zinc-900/80 to-cyan-950/30 backdrop-blur-md border border-white/10 hover:border-sky-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(14,165,233,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="size-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(14,165,233,0.4)] group-hover:scale-110 transition-transform duration-300">
                <Gamepad2 className="size-5" />
              </div>
              <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-sky-400 transition-colors">
                {t("Lobby Control")}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold tracking-wide uppercase relative z-10 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <span>{t("Game servers")}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </div>
          </Link>
        )}
      </nav>

      {/* Settings Toggle Button (Bottom Right) */}
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:border-brand/40 hover:bg-zinc-800/90 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-brand/40"
        title={t("Background Settings")}
        aria-label={t("Background Settings")}
      >
        <Settings
          className={`size-5 transition-transform duration-500 ${
            isSettingsOpen ? "rotate-90 text-brand" : "group-hover:rotate-90"
          }`}
        />
      </button>

      {/* Settings Menu Panel */}
      {isSettingsOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 rounded-2xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-5 text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sliders className="size-4.5 text-brand" />
              <h3 className="font-display font-bold text-base text-zinc-100">
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
            {/* Blur Slider (Step 1) */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-medium">
                <span className="text-zinc-300">{t("Blur")}</span>
                <span className="text-brand font-mono font-bold">{blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-brand bg-zinc-800 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>0px</span>
                <span>25px</span>
                <span>50px</span>
              </div>
            </div>

            {/* Brightness Slider (Step 1) */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-medium">
                <span className="text-zinc-300">{t("Brightness")}</span>
                <span className="text-brand font-mono font-bold">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-brand bg-zinc-800 rounded-lg cursor-pointer h-2"
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
                      ? "bg-brand/15 border-brand text-brand"
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
                      ? "bg-brand/15 border-brand text-brand"
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



