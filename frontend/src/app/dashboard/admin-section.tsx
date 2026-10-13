"use client";

import Link from "next/link";
import { t } from "@/lib/lang";
import {
  Activity,
  Shield,
  ArrowUpRight,
} from "lucide-react";

export function AdminSection() {
  return (
      <section className="w-full max-w-3xl relative z-10 mb-8">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Shield className="size-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t("System / Beheer")}
          </span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>
  
        <Link
          href="/pulse"
          className="group relative flex items-center justify-between p-4 sm:p-5 squircle-card bg-zinc-900/80 backdrop-blur-[16px] border border-white/[0.08] hover:border-[#FF1744]/50 transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-[0_0_2rem_-0.5rem_rgba(255,23,68,0.35)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF1744]/10 via-transparent to-[#FF1744]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="size-11 squircle-icon bg-[#FF1744]/15 border border-[#FF1744]/30 flex items-center justify-center text-[#FF1744] shrink-0 shadow-[0_0_1.5rem_-0.25rem_rgba(255,23,68,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_2rem_-0.25rem_rgba(255,23,68,0.6)] transition-all duration-300 relative overflow-visible">
              <Activity className="size-5" />
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
                  stroke="rgba(255,23,68,0.95)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray="120"
                  strokeDashoffset="120"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base sm:text-lg text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                  Pulse
                </h2>
                <span className="text-[10px] font-semibold text-[#FF1744] bg-[#FF1744]/15 border border-[#FF1744]/30 px-2.5 py-0.5 squircle-pill">
                  Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium tracking-wide truncate">
                {t("Monitoring")} &middot; {t("Systeembeheer")}
              </p>
            </div>
          </div>
  
          <div className="size-8 squircle-action bg-[#FF1744]/15 border border-[#FF1744]/30 flex items-center justify-center text-[#FF1744] group-hover:bg-[#FF1744] group-hover:text-zinc-950 transition-all duration-200 shrink-0 ml-3">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      </section>
  );
}
