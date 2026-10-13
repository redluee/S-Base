"use client";

import { Search } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprint } from "@/lib/api";

interface StoryFiltersProps {
  sprints: MinorSprint[];
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedSprintId: string;
  setSelectedSprintId: React.Dispatch<React.SetStateAction<string>>;
  selectedType: string;
  setSelectedType: React.Dispatch<React.SetStateAction<string>>;
  selectedStatus: string;
  setSelectedStatus: React.Dispatch<React.SetStateAction<string>>;
  selectedLU: string;
  setSelectedLU: React.Dispatch<React.SetStateAction<string>>;
}

export function StoryFilters({ sprints, searchQuery, setSearchQuery, selectedSprintId, setSelectedSprintId, selectedType, setSelectedType, selectedStatus, setSelectedStatus, selectedLU, setSelectedLU }: StoryFiltersProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Zoek op titel, nummer, criterium, rol...")}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Sprint Filter */}
        <select
          value={selectedSprintId}
          onChange={(e) => setSelectedSprintId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
        >
          <option value="all">{t("Alle Sprints & Concepten")}</option>
          <option value="unassigned">{t("Concepten / Geen sprint")}</option>
          {sprints.map((sp) => (
            <option key={sp.id} value={String(sp.id)}>
              {sp.sprintNumber}: {sp.name}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
        >
          <option value="all">{t("Alle Typen (US / RS / LS)")}</option>
          <option value="US">{t("US - User Story")}</option>
          <option value="RS">{t("RS - Research Story")}</option>
          <option value="LS">{t("LS - Learning Story")}</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
        >
          <option value="all">{t("Alle Statussen")}</option>
          <option value="todo">{t("To Do")}</option>
          <option value="in_progress">{t("Bezig")}</option>
          <option value="done">{t("Voltooid")}</option>
        </select>
      </div>

      {/* Quick LU Pills */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
        <span className="text-[11px] font-semibold text-zinc-500 mr-1">{t("Leeruitkomst:")}</span>
        <button
          onClick={() => setSelectedLU("all")}
          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
            selectedLU === "all"
              ? "bg-brand/20 border border-brand/40 text-brand"
              : "bg-zinc-950 border border-white/5 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t("Alle")}
        </button>
        {[1, 2, 3, 4, 5].map((lu) => (
          <button
            key={lu}
            onClick={() => setSelectedLU(selectedLU === String(lu) ? "all" : String(lu))}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              selectedLU === String(lu)
                ? "bg-brand/20 border border-brand/40 text-brand"
                : "bg-zinc-950 border border-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            LU {lu}
          </button>
        ))}

        {(searchQuery || selectedSprintId !== "all" || selectedType !== "all" || selectedStatus !== "all" || selectedLU !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedSprintId("all");
              setSelectedType("all");
              setSelectedStatus("all");
              setSelectedLU("all");
            }}
            className="text-[11px] text-zinc-500 hover:text-red-400 ml-auto cursor-pointer"
          >
            {t("Filters resetten")}
          </button>
        )}
      </div>
    </div>
  );
}
