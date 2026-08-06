"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/lang";
import { SearchBar } from "@/components/search-bar";
import { User, Dumbbell, ChefHat } from "lucide-react";

export function NavHeader({ username }: { username: string }) {
  const pathname = usePathname();

  if (pathname.includes("/workouts/session")) {
    return null;
  }

  const isWorkouts = pathname.includes("/workouts");
  const isRecipes = pathname.includes("/recipes");

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="font-display text-xl text-brand hover:opacity-85 transition-opacity whitespace-nowrap">
          S-Base
        </Link>
        {isWorkouts && (
          <Link
            href="/workouts"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 transition-all cursor-pointer"
          >
            <Dumbbell className="size-3.5" />
            <span className="hidden xs:inline">{t("Workout Studio")}</span>
          </Link>
        )}
        {isRecipes && (
          <Link
            href="/recipes"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <ChefHat className="size-3.5" />
            <span className="hidden xs:inline">{t("Taste tracker")}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchBar />

        <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-full sm:bg-zinc-900 sm:border sm:border-border">
          <div className="size-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <User className="size-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-300 hidden sm:inline">{username}</span>
        </div>
      </div>
    </header>
  );
}
