"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { useState, useEffect, useRef } from "react";
import { Dumbbell, ChefHat, User, LogOut, ChevronDown } from "lucide-react";

export function DashboardClient({ username }: { username: string }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden bg-zinc-950 text-foreground w-full">
      {/* Background Decorative Radial Glows */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,227,164,0.05)_0%,_transparent_70%)] pointer-events-none" />
      <div className="fixed -top-40 -left-40 size-96 bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 size-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Account Circle Dropdown Header */}
      <header className="absolute top-6 right-6 z-30" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1.5 px-3 rounded-full bg-zinc-900/80 border border-white/5 hover:border-brand/30 hover:bg-zinc-900 transition-all duration-200 focus:outline-none cursor-pointer"
        >
          <div className="size-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <User className="size-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-300 hidden sm:inline">{username}</span>
          <ChevronDown className={`size-3.5 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl z-40 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-2 text-xs border-b border-zinc-800">
              <p className="text-zinc-500">{t("Logged in as")}</p>
              <p className="font-semibold text-zinc-200 truncate mt-0.5">{username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800/60 hover:text-red-300 transition-colors text-left font-medium cursor-pointer"
            >
              <LogOut className="size-4" />
              {t("Logout")}
            </button>
          </div>
        )}
      </header>

      {/* Main Title Section */}
      <section className="text-center mb-16 max-w-xl">
        <h1
          className="font-display text-[clamp(2.25rem,6vw+1rem,5rem)] leading-none mb-4 select-none font-black tracking-tight whitespace-nowrap"
          style={{ textShadow: "0 0 3rem rgba(0,227,164,0.15)" }}
        >
          {t("Welcome to")} <span className="text-brand">S</span>-Base
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80 font-medium">
          {t("Built for personal use and development")}
        </p>
      </section>

      {/* Cards Grid */}
      <nav className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-16 z-10">
        {/* Workout Studio Card */}
        <a
          href="/workouts"
          className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-950/15 via-zinc-900/60 to-emerald-950/10 border border-white/5 hover:border-brand/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(0,227,164,0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
          <div className="flex flex-col gap-6 relative z-10">
            <div className="size-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-[0_0_1.5rem_-0.25rem_rgba(0,227,164,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Dumbbell className="size-7" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-zinc-100 tracking-tight group-hover:text-brand transition-colors">
                {t("Workout Studio")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand font-semibold tracking-wide uppercase mt-8 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
            <span>{t("Start training")}</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </a>

        {/* Taste Tracker Card */}
        <a
          href="/recipes"
          className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/15 via-zinc-900/60 to-orange-950/10 border border-white/5 hover:border-amber-500/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(245,158,11,0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
          <div className="flex flex-col gap-6 relative z-10">
            <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_1.5rem_-0.25rem_rgba(245,158,11,0.3)] group-hover:scale-110 transition-transform duration-300">
              <ChefHat className="size-7" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-zinc-100 tracking-tight group-hover:text-amber-400 transition-colors">
                {t("Taste tracker")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold tracking-wide uppercase mt-8 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
            <span>{t("Taste tracker")}</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </a>
      </nav>
    </main>
  );
}
