"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { SearchBar } from "@/components/search-bar";
import { User, LogOut, ChevronDown, ArrowRightLeft } from "lucide-react";
import { ModuleIcon } from "@/components/module-icon";
import { moduleForPath } from "@/lib/modules";
import type { AuthUser } from "@/lib/api";
import { ImpersonationBanner, useStopImpersonation } from "@/components/impersonation-banner";

export function NavHeader({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { stop: handleStopImpersonation, isStopping } = useStopImpersonation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { username, isImpersonated, impersonatedBy } = user;
  const current = moduleForPath(pathname);

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
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-lg focus-visible:bg-zinc-900 focus-visible:border focus-visible:border-brand focus-visible:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:font-semibold focus-visible:text-sm"
      >
        {t("Skip to content")}
      </a>
      {isImpersonated && impersonatedBy && (
        <ImpersonationBanner username={username} impersonatedBy={impersonatedBy} />
      )}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex min-h-11 min-w-11 items-center gap-2 font-display text-xl text-brand hover:opacity-85 transition-opacity whitespace-nowrap">
            <Image src="/logo.svg" alt="" width={48} height={18} />
            <span className="hidden sm:inline">S-Base</span>
            <span className="sr-only sm:hidden">S-Base</span>
          </Link>
          {current && (
            <Link
              href={current.href}
              style={{ "--module-color": current.accentColor } as CSSProperties}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-(--module-color) transition-colors hover:bg-(--module-color)/15 [&_svg]:size-3.5"
            >
              <ModuleIcon id={current.id} />
              <span className="hidden xs:inline">{t(current.title)}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {current?.search && <SearchBar scope={current.search} />}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-zinc-900 border border-border hover:border-brand/30 hover:bg-zinc-800 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
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
                      {t("by {admin}", { admin: impersonatedBy })}
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

                {process.env.NODE_ENV !== "production" && (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs text-red-400 hover:bg-zinc-800/60 hover:text-red-300 transition-colors text-left font-medium cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    {t("Logout")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
