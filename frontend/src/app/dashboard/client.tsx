"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/lang";
import { compressImage } from "@/lib/image";
import { api, type AuthUser } from "@/lib/api";
import type { WorkoutSession } from "@backend/types/workout";
import { RunningWorkoutCard } from "@/app/workouts/running-workout-card";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useActionError } from "@/lib/use-action-error";
import { DEFAULT_BG, DEFAULT_BLUR, DEFAULT_BRIGHTNESS } from "./dashboard-modules";
import { canOpen, moduleById, type ModuleId } from "@/lib/modules";
import { ModuleGrid } from "./module-grid";
import { BackgroundSettingsPanel } from "./background-settings-panel";
import { User, Settings } from "lucide-react";


export function DashboardClient({ user }: { user: AuthUser }) {
  const { username, modules: userModules, isImpersonated, impersonatedBy } = user;
  const [blur, setBlur] = useState<number>(DEFAULT_BLUR);
  const [brightness, setBrightness] = useState<number>(DEFAULT_BRIGHTNESS);
  const [bgImage, setBgImage] = useState<string>(DEFAULT_BG);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [runningSession, setRunningSession] = useState<WorkoutSession | null>(null);
  const [hasOnlineServer, setHasOnlineServer] = useState<boolean>(false);
  const [openTodoCount, setOpenTodoCount] = useState<number>(0);
  const { error: sessionsError, report: reportSessionsError } = useActionError();

  useEffect(() => {
    if (canOpen(moduleById("workout"), userModules)) {
      api.workouts.sessions
        .list("active")
        .then((sessions) => {
          if (sessions && sessions.length > 0) {
            setRunningSession(sessions[0]);
          }
        })
        .catch((err) => reportSessionsError(err, "Could not load the running workout."));
    }

    if (canOpen(moduleById("minecraft"), userModules)) {
      api.minecraft.servers
        .list()
        .then((servers) => {
          setHasOnlineServer(Array.isArray(servers) && servers.some((s) => s.online));
        })
        .catch(() => {
          setHasOnlineServer(false);
        });
    }

    if (canOpen(moduleById("todo"), userModules)) {
      api.todo
        .count()
        .then((result) => setOpenTodoCount(result.open))
        .catch(() => setOpenTodoCount(0));
    }
  }, [userModules, reportSessionsError]);

  const storageKey = `sbase_dashboard_bg_${username.toLowerCase().trim() || "default"}`;

  const canAccess = (moduleId: ModuleId) => canOpen(moduleById(moduleId), userModules);

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
      }
    }

    requestAnimationFrame(() => {
      if (nextBlur !== undefined) setBlur(nextBlur);
      if (nextBrightness !== undefined) setBrightness(nextBrightness);
      if (nextBgImage !== undefined) setBgImage(nextBgImage);
      setIsLoaded(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ blur, brightness, bgImage }));
    } catch {
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
    <main id="main-content" className="flex flex-col items-center justify-start min-h-screen px-4 sm:px-6 pt-20 sm:pt-20 pb-20 sm:pb-16 relative overflow-x-hidden bg-zinc-950 text-foreground w-full font-sans">
      {isImpersonated && impersonatedBy && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <ImpersonationBanner username={username} impersonatedBy={impersonatedBy} />
        </div>
      )}

      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105 transition-[filter,background-image] duration-300"
        style={{
          backgroundImage: bgImage && bgImage !== "none" ? `url('${bgImage}')` : "none",
          filter: `blur(${blur}px) brightness(${brightness}%) contrast(1.1)`,
        }}
      />

      <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/50 to-zinc-950/90 pointer-events-none" />

      <header
        className={`absolute ${
          isImpersonated ? "top-14" : "top-6"
        } right-4 sm:right-6 z-30 flex items-center gap-2 p-1.5 px-3.5 squircle-pill bg-zinc-900/80 border border-white/10 backdrop-blur-[16px] shadow-lg`}
      >
        <div className="size-6 sm:size-7 squircle-pill bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shadow-[0_0_8px_color-mix(in_oklab,var(--color-brand)_30%,transparent)]">
          <User className="size-3.5 sm:size-4" />
        </div>
        <span className="text-xs font-semibold text-zinc-200 tracking-wide">{username}</span>
      </header>

      <section className="text-center mb-5 sm:mb-6 max-w-3xl relative z-10 w-full px-2 @container">
        <h1
          className="font-display text-[clamp(1.75rem,5cqw,2.75rem)] whitespace-nowrap leading-none mb-3 select-none font-black tracking-tight drop-shadow-xl [text-shadow:0_0_3rem_color-mix(in_oklab,var(--color-brand)_25%,transparent)]"
        >
          {t("Welcome to")} <span className="text-brand">S</span>-Base
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium">
          {t("Built for personal use and development")}
        </p>
      </section>

      {sessionsError && (
        <div className="w-full max-w-5xl mb-3 relative z-20">
          <InlineAlert>{sessionsError}</InlineAlert>
        </div>
      )}

      {runningSession && (
        <div className="w-full max-w-5xl mb-3 relative z-20 animate-in fade-in slide-in-from-top-3 duration-300">
          <RunningWorkoutCard
            session={runningSession}
            compact
            onDiscard={() => setRunningSession(null)}
          />
        </div>
      )}

      <ModuleGrid
        canAccess={canAccess}
        hasOnlineServer={hasOnlineServer}
        openTodoCount={openTodoCount}
      />

      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 squircle-icon bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:border-brand/40 hover:bg-zinc-800/90 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-brand/40"
        title={t("Background Settings")}
        aria-label={t("Background Settings")}
      >
        <Settings
          className={`size-5 transition-transform duration-500 ${
            isSettingsOpen ? "rotate-90 text-brand" : "group-hover:rotate-90"
          }`}
        />
      </button>

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
