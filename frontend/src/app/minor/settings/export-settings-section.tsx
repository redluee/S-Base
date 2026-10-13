"use client";

import { Link2 } from "lucide-react";
import { t } from "@/lib/lang";

interface ExportSettingsSectionProps {
  lastName: string;
  setLastName: (v: string) => void;
  portfolioUrl: string;
  setPortfolioUrl: (v: string) => void;
  savingPortfolioUrl: boolean;
  portfolioUrlSaved: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ExportSettingsSection({
  lastName,
  setLastName,
  portfolioUrl,
  setPortfolioUrl,
  savingPortfolioUrl,
  portfolioUrlSaved,
  onSubmit,
}: ExportSettingsSectionProps) {
  return (
  <section className="space-y-4">
    <div className="flex items-center gap-2.5">
      <Link2 className="size-5 text-brand" />
      <h2 className="text-lg font-bold text-white tracking-tight">
        {t("Exportgegevens")}
      </h2>
    </div>

    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="last-name" className="text-xs font-semibold text-zinc-400">
              {t("Achternaam")}
            </label>
            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("vul hier je achternaam in")}
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <p className="text-[11px] text-zinc-500">
              {t("Wordt gebruikt in de standaard bestandsnaam van je export.")}
            </p>
          </div>
          <div className="flex-1 space-y-1.5">
            <label htmlFor="portfolio-url" className="text-xs font-semibold text-zinc-400">
              {t("Portfolio site URL")}
            </label>
            <input
              id="portfolio-url"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder={t("vul hier je portfolio site url in")}
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <p className="text-[11px] text-zinc-500">
              {t("Deze link wordt automatisch ingevuld op de eerste pagina van de PDF-export.")}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingPortfolioUrl}
          className="flex items-center justify-center gap-2 min-h-11 py-2.5 px-4 rounded-xl bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start"
        >
          {portfolioUrlSaved ? t("Opgeslagen") : savingPortfolioUrl ? t("Opslaan...") : t("Opslaan")}
        </button>
      </form>
    </div>
  </section>
  );
}
