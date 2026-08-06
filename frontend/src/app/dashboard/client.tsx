"use client";

import Link from "next/link";
import { t } from "@/lib/lang";
import { Dumbbell, ChefHat, User, Music, Heart } from "lucide-react";

export function DashboardClient({ username }: { username: string }) {
  const isSpecialUser =
    username.toLowerCase() === "dèmi" ||
    username.toLowerCase() === "demi" ||
    username.toLowerCase() === "admin";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden bg-zinc-950 text-foreground w-full">
      {/* Background Decorative Radial Glows */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,227,164,0.05)_0%,_transparent_70%)] pointer-events-none" />
      <div className="fixed -top-40 -left-40 size-96 bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 size-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Account Circle Header */}
      {process.env.NODE_ENV === "development" && (
        <header className="absolute top-6 right-6 z-30 flex items-center gap-2 p-1.5 px-3 rounded-full bg-zinc-900/80 border border-white/5">
          <div className="size-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <User className="size-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-300 inline">{username}</span>
        </header>
      )}

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
      <nav className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl mb-16 z-10">
        {/* Workout Studio Card */}
        <Link
          href="/workouts"
          className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-teal-950/15 via-zinc-900/60 to-emerald-950/10 border border-white/5 hover:border-brand/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(0,227,164,0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="size-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(0,227,164,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Dumbbell className="size-5" />
            </div>
            <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-brand transition-colors">
              {t("Workout Studio")}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand font-semibold tracking-wide uppercase relative z-10 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
            <span>{t("Start training")}</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </Link>

        {/* Taste Tracker Card */}
        <Link
          href="/recipes"
          className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-amber-950/15 via-zinc-900/60 to-orange-950/10 border border-white/5 hover:border-amber-500/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(245,158,11,0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(245,158,11,0.3)] group-hover:scale-110 transition-transform duration-300">
              <ChefHat className="size-5" />
            </div>
            <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-amber-400 transition-colors">
              {t("Taste tracker")}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold tracking-wide uppercase relative z-10 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
            <span>{t("Recipes and wines")}</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </Link>

        {isSpecialUser && (
          <>
            {/* Lyric Quotes Card */}
            <a
              href="https://stevenheijn.nl/lyric_quotes/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-violet-950/15 via-zinc-900/60 to-purple-950/10 border border-white/5 hover:border-violet-500/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(139,92,246,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="size-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(139,92,246,0.3)] group-hover:scale-110 transition-transform duration-300">
                  <Music className="size-5" />
                </div>
                <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-violet-400 transition-colors">
                  {t("Lyric Quotes")}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold tracking-wide uppercase relative z-10 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                <span>{t("Bekijk quotes")}</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </a>

            {/* Voor Jou Card */}
            <a
              href="https://stevenheijn.nl/you"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-rose-950/15 via-zinc-900/60 to-pink-950/10 border border-white/5 hover:border-rose-500/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(244,63,94,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="size-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(244,63,94,0.3)] group-hover:scale-110 transition-transform duration-300">
                  <Heart className="size-5" />
                </div>
                <h2 className="font-display font-black text-xl text-zinc-100 tracking-tight group-hover:text-rose-400 transition-colors">
                  {t("You")}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold tracking-wide uppercase relative z-10 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                <span>{t("Poems for each other")}</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </a>
          </>
        )}
      </nav>
    </main>
  );
}
