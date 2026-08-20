"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { SearchBar } from "@/components/search-bar";
import { User, LogOut, ChevronDown, Dumbbell, ChefHat, Banknote, Gamepad2, ArrowRightLeft } from "lucide-react";
import { ImpersonationBanner } from "@/components/impersonation-banner";

interface NavHeaderProps {
  username: string;
  isImpersonated?: boolean;
  impersonatedBy?: string | null;
}

export function NavHeader({
  username,
  isImpersonated: initialIsImpersonated,
  impersonatedBy: initialImpersonatedBy,
}: NavHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fetchedImpersonation, setFetchedImpersonation] = useState<{
    isImpersonated: boolean;
    impersonatedBy: string | null;
  } | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isImpersonated = initialIsImpersonated ?? fetchedImpersonation?.isImpersonated ?? false;
  const impersonatedBy = initialImpersonatedBy ?? fetchedImpersonation?.impersonatedBy ?? null;

  useEffect(() => {
    if (initialIsImpersonated === undefined) {
      // Fallback: check session state client-side
      api.me()
        .then((res) => {
          if (res.user.isImpersonated) {
            setFetchedImpersonation({
              isImpersonated: true,
              impersonatedBy: res.user.impersonatedBy ?? null,
            });
          }
        })
        .catch(() => {});
    }
  }, [initialIsImpersonated]);

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
  const isGames = pathname.includes("/games");

  async function handleLogout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

  async function handleStopImpersonation() {
    setIsStopping(true);
    try {
      await api.stopImpersonate();
      router.push("/pulse");
      router.refresh();
    } catch {
      setIsStopping(false);
    }
  }

  return (
    <>
      {isImpersonated && impersonatedBy && (
        <ImpersonationBanner username={username} impersonatedBy={impersonatedBy} />
      )}
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
          {isGames && (
            <Link
              href="/games/minecraft"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer"
            >
              <Gamepad2 className="size-3.5" />
              <span className="hidden xs:inline">{t("Lobby Control")}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SearchBar />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-zinc-900 border border-border hover:border-brand/30 hover:bg-zinc-800 transition-all duration-150 focus:outline-none cursor-pointer"
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center border ${
                  isImpersonated
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : "bg-brand/10 border-brand/20 text-brand"
                }`}
              >
                <User className="size-3.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 hidden sm:inline">{username}</span>
              <ChevronDown className={`size-3 text-zinc-500 transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-2 text-[11px] border-b border-zinc-800">
                  <p className="text-zinc-500">{t("Logged in as")}</p>
                  <p className="font-semibold text-zinc-100 truncate mt-0.5">{username}</p>
                  {isImpersonated && impersonatedBy && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
                      door {impersonatedBy}
                    </span>
                  )}
                </div>

                {isImpersonated && (
                  <button
                    onClick={handleStopImpersonation}
                    disabled={isStopping}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors text-left font-medium cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className="size-3.5" />
                    {isStopping ? t("Returning to admin...") : t("Stop impersonation")}
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs text-red-400 hover:bg-zinc-800/60 hover:text-red-300 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  {t("Logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
