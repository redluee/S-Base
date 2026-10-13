"use client";

import { ArrowRight, Plus, Users, ExternalLink } from "lucide-react";
import { toExternalHref } from "@/lib/uri";
import Link from "next/link";
import { t } from "@/lib/lang";
import type { MinorDashboardStats, MinorSprint } from "@/lib/api";

interface DashboardOverviewProps {
  stats: MinorDashboardStats;
  sprints: MinorSprint[];
  openCreateSprintModal: () => void;
  setIsPeerModalOpen: (open: boolean) => void;
}

export function DashboardOverview({ stats, sprints, openCreateSprintModal, setIsPeerModalOpen }: DashboardOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sprints List (2 cols) */}
      <section className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">
            {t("Sprintoverzicht")}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreateSprintModal}
              title={t("Sprint toevoegen")}
              aria-label={t("Sprint toevoegen")}
              className="text-xs text-zinc-300 hover:text-brand flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">{t("Sprint toevoegen")}</span>
            </button>
            <span className="text-zinc-600 text-xs">·</span>
            <Link
              href="/minor/sprints"
              className="text-xs text-brand hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{t("Beheer sprints")}</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          {sprints.length === 0 ? (
            <div className="p-8 rounded-xl bg-zinc-900/50 border border-white/10 text-center text-zinc-400 text-xs">
              {t("Nog geen sprints aangemaakt. Maak je eerste sprint aan.")}
            </div>
          ) : (
            sprints.slice(-3).map((s) => (
              <Link
                key={s.id}
                href={`/minor/sprints/${s.id}`}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-white/10 hover:border-brand/40 transition-all group cursor-pointer gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-8 h-8 px-2 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-zinc-300 group-hover:text-brand transition-colors shrink-0 whitespace-nowrap">
                    {s.sprintNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-white group-hover:text-brand transition-colors truncate">
                      {s.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {s.startDate} t/m {s.endDate} · Show & Grow: {s.showAndGrowDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.extendedDays > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hidden sm:inline">
                      +{s.extendedDays}d
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      s.status === "active"
                        ? "bg-brand/10 text-brand border border-brand/20"
                        : s.status === "completed"
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Peer Help Highlights (1 col) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="size-4 text-purple-400" />
            <span>{t("Kennisdeling")}</span>
          </h2>
          <Link
            href="/minor/peer-help"
            className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>{t("Alles bekijken")}</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <button
          onClick={() => setIsPeerModalOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-white/10 transition-all cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>{t("Kennisdeling loggen")}</span>
        </button>

        <div className="space-y-2">
          {stats.recentPeerHelp.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/10 text-center text-zinc-400 text-xs">
              {t("Geen kennisdeling geregistreerd.")}
            </div>
          ) : (
            stats.recentPeerHelp.map((peer) => (
              <div key={peer.id} className="p-3 rounded-xl bg-zinc-900/70 border border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{peer.peerName}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{peer.date}</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">{peer.description}</p>
                {peer.links && (
                  <a
                    href={toExternalHref(peer.links)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline pt-0.5"
                  >
                    <ExternalLink className="size-2.5" />
                    <span>{t("Link naar bewijs")}</span>
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
