"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";

export function DashboardClient({ username }: { username: string }) {
  const router = useRouter();

  async function handleLogout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,227,164,0.06)_0%,_transparent_70%)] pointer-events-none" />
      <header className="text-center mb-12">
        <h1
          className="font-display text-[clamp(2rem,5vw+1rem,6rem)] leading-none mb-4"
          style={{ textShadow: "0 0 2rem #00e3a4" }}
        >
          {t("Welcome to")} {username} <span className="text-brand">S</span>-Base
        </h1>
      </header>
      <nav className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href="/workouts"
          className="w-full py-3 px-5 bg-brand text-zinc-900 font-display font-black text-xl border-2 border-brand rounded-xl text-center transition-all duration-200 hover:bg-brand-hover hover:scale-[0.97] active:shadow-glow-inner"
        >
          {t("Workout Studio")}
        </a>
        <a
          href="/recipes"
          className="w-full py-3 px-5 bg-amber-500/20 text-amber-300 font-display font-black text-xl border-2 border-amber-500/30 rounded-xl text-center transition-all duration-200 hover:bg-amber-500/30 hover:scale-[0.97] active:shadow-glow-inner"
        >
          {t("Taste tracker")}
        </a>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full border-border text-foreground/60 hover:text-foreground"
        >
          {t("Logout")}
        </Button>
      </nav>
    </main>
  );
}
