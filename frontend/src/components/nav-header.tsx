"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { SearchBar } from "@/components/search-bar";
import { User, LogOut, ChevronDown, Dumbbell, ChefHat, Banknote } from "lucide-react";

export function NavHeader({ username }: { username: string }) {
  const router = useRouter();
  const pathname = usePathname();
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

  if (pathname.includes("/workouts/session")) {
    return null;
  }

  const isWorkouts = pathname.includes("/workouts");
  const isRecipes = pathname.includes("/recipes");
  const isCashflow = pathname.includes("/cashflow");

  async function handleLogout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

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
        {isCashflow && (
          <Link
            href="/cashflow"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Banknote className="size-3.5" />
            <span className="hidden xs:inline">{t("Cashflow")}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchBar />

        {process.env.NODE_ENV === "development" && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 px-2.5 rounded-full sm:bg-zinc-900 sm:border sm:border-border sm:hover:border-brand/30 sm:hover:bg-zinc-800 transition-all duration-150 focus:outline-none cursor-pointer"
            >
              <div className="size-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <User className="size-3.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 hidden sm:inline">{username}</span>
              <ChevronDown className={`size-3 text-zinc-500 transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 origin-top-right rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl z-40 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] border-b border-zinc-800">
                  <p className="text-zinc-500">{t("Logged in as")}</p>
                  <p className="font-semibold text-zinc-200 truncate mt-0.5">{username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-zinc-800/60 hover:text-red-300 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  {t("Logout")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
