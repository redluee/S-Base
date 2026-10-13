"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/lang";
import { compressImage } from "@/lib/image";
import { api, type AuthUser } from "@/lib/api";
import type { WorkoutSession } from "@backend/types/shared";
import { RunningWorkoutCard } from "@/components/running-workout-card";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { MODULES, DEFAULT_BG, DEFAULT_BLUR, DEFAULT_BRIGHTNESS } from "./dashboard-modules";
import { ModuleGrid } from "./module-grid";
import { AdminSection } from "./admin-section";
import { BackgroundSettingsPanel } from "./background-settings-panel";
import { User, Settings } from "lucide-react";


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
  const [hasOnlineServer, setHasOnlineServer] = useState<boolean>(false);

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

    if (Array.isArray(userModules) && (userModules.includes("minecraft") || userModules.includes("minecraft:monitor"))) {
      api.minecraft.servers
        .list()
        .then((servers) => {
          setHasOnlineServer(Array.isArray(servers) && servers.some((s) => s.online));
        })
        .catch(() => {
          setHasOnlineServer(false);
        });
    }
  }, [userModules]);

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

  // Cashflow (4 cols) and CV Builder (2 cols) share one grid row (4+2=6).
  // When only one of the pair is accessible, it expands to fill the full row.
  const cashflowOnlyInPair = canAccess("cashflow") && !canAccess("resume");
  const resumeOnlyInPair = canAccess("resume") && !canAccess("cashflow");

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
    <main id="main-content" className="flex flex-col items-center justify-start min-h-screen px-4 sm:px-6 pt-20 sm:pt-24 pb-28 relative overflow-x-hidden bg-zinc-950 text-foreground w-full font-sans">
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

      {/* Top Header Bar */}
      <header
        className={`absolute ${
          isImpersonated ? "top-14" : "top-6"
        } right-4 sm:right-6 z-30 flex items-center gap-2 p-1.5 px-3.5 squircle-pill bg-zinc-900/80 border border-white/10 backdrop-blur-[16px] shadow-lg`}
      >
        <div className="size-6 sm:size-7 squircle-pill bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.3)]">
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
      <ModuleGrid
        canAccess={canAccess}
        hasOnlineServer={hasOnlineServer}
        cashflowOnlyInPair={cashflowOnlyInPair}
        resumeOnlyInPair={resumeOnlyInPair}
      />

      {/* Admin Section (Role-Gated for user.role === 'admin') */}
      {currentRole === "admin" && canAccess("pulse") && <AdminSection />}

      {/* Settings Toggle Button (Bottom Right) */}
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 squircle-icon bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:border-[#00E676]/40 hover:bg-zinc-800/90 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#00E676]/40"
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
        <BackgroundSettingsPanel
          blur={blur}
          setBlur={setBlur}
          brightness={brightness}
          setBrightness={setBrightness}
          bgImage={bgImage}
          setBgImage={setBgImage}
          resetDefaults={resetDefaults}
          handleFileUpload={handleFileUpload}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </main>
  );
}
