"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowDashboardStats } from "@/lib/api";
import { TrendingUp, Clock, FileText, CheckCircle, Plus, ArrowRight } from "lucide-react";
import { YearSelector } from "@/components/year-selector";

function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function getMonthsForYear(year: number): string[] {
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

function MonthLabel({ month }: { month: string }) {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return (
    <span className="text-[10px] text-zinc-500">
      {date.toLocaleDateString("nl-NL", { month: "short" })}
    </span>
  );
}

export function CashflowDashboardClient({ stats: initialStats }: { stats: CashflowDashboardStats | null }) {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [stats, setStats] = useState<CashflowDashboardStats | null>(initialStats);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await api.cashflow.dashboard(selectedYear);
        if (isMounted) {
          setStats(res);
        }
      } catch {
        // keep existing stats on error
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const months = getMonthsForYear(selectedYear);
  const incomeMap = new Map((stats?.monthlyIncome ?? []).map((m) => [m.month, m.total]));
  const maxIncome = Math.max(...months.map((m) => incomeMap.get(m) ?? 0), 1);

  const paid = stats?.statusTotals.find((s) => s.status === "paid");
  const sent = stats?.statusTotals.find((s) => s.status === "sent");
  const overdue = stats?.statusTotals.find((s) => s.status === "overdue");
  const draft = stats?.statusTotals.find((s) => s.status === "draft");

  const outstanding = (sent?.total ?? 0) + (overdue?.total ?? 0);
  const outstandingCount = (sent?.count ?? 0) + (overdue?.count ?? 0);

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("Cashflow")}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{t("Facturatie")}</p>
        </div>
        <Link
          href="/cashflow/invoices/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="size-4" />
          {t("Nieuwe factuur")}
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 lg:col-span-1 rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-400">
            <TrendingUp className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("Omzet")} {selectedYear}</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatEuro(stats?.totalPaid12m ?? 0)}</p>
          <p className="text-xs text-zinc-500">{paid?.count ?? 0} betaalde facturen</p>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("Openstaand")}</span>
          </div>
          <p className="text-xl font-bold text-white">{formatEuro(outstanding)}</p>
          <p className="text-xs text-zinc-500">{outstandingCount} facturen</p>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-zinc-400">
            <FileText className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("Concept")}</span>
          </div>
          <p className="text-xl font-bold text-white">{formatEuro(draft?.total ?? 0)}</p>
          <p className="text-xs text-zinc-500">{draft?.count ?? 0} facturen</p>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400">
            <Clock className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("Te laat")}</span>
          </div>
          <p className="text-xl font-bold text-white">{formatEuro(overdue?.total ?? 0)}</p>
          <p className="text-xs text-zinc-500">{overdue?.count ?? 0} facturen</p>
        </div>
      </div>

      {/* Income Chart */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">{t("Omzet per maand")}</h2>
          <YearSelector year={selectedYear} onChange={setSelectedYear} />
        </div>
        <div className={`flex items-end gap-1.5 h-36 transition-opacity duration-200 ${loading ? "opacity-50" : "opacity-100"}`}>
          {months.map((month) => {
            const val = incomeMap.get(month) ?? 0;
            const heightPct = maxIncome > 0 ? (val / maxIncome) * 100 : 0;
            const isCurrentMonth = month === currentMonthStr;
            return (
              <div key={month} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {formatEuro(val)}
                </div>
                <div className="w-full flex items-end" style={{ height: "120px" }}>
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isCurrentMonth ? "bg-blue-500" : val > 0 ? "bg-blue-500/40 group-hover:bg-blue-500/60" : "bg-zinc-800"
                    }`}
                    style={{ height: `${Math.max(heightPct, val > 0 ? 4 : 2)}%` }}
                  />
                </div>
                <MonthLabel month={month} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/cashflow/invoices", label: "Facturen bekijken", icon: FileText },
          { href: "/cashflow/projects", label: "Projecten bekijken", icon: CheckCircle },
          { href: "/cashflow/clients", label: "Klanten bekijken", icon: CheckCircle },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
          >
            <div className="flex items-center gap-2 text-sm text-zinc-300 group-hover:text-white transition-colors">
              <Icon className="size-4 text-zinc-500" />
              {label}
            </div>
            <ArrowRight className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
