"use client";

import { Tag, Plus, Trash2, Edit2, CheckSquare } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStoryType } from "@/lib/api";
import { getStoryTypeDetails } from "@/components/minor-story-type-badge";

interface StoryTypeSectionProps {
  storyTypes: MinorStoryType[];
  onCreate: () => void;
  onEdit: (st: MinorStoryType) => void;
  onDelete: (id: number) => void;
}

export function StoryTypeSection({ storyTypes, onCreate, onEdit, onDelete }: StoryTypeSectionProps) {
  return (
    <>
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Tag className="size-5 text-brand" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            {t("Story Typen & Kwaliteitscriteria (US, RS, LS & Custom)")}
          </h2>
        </div>
        <button
          onClick={onCreate}
          title={t("Story Type toevoegen")}
          aria-label={t("Story Type toevoegen")}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t("Story Type toevoegen")}</span>
          <span className="sm:hidden">{t("Type toevoegen")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {storyTypes.map((st) => {
          const criteriaCount = st.defaultQualityCriteria?.length || 0;
          const typeDetails = getStoryTypeDetails(st.code, storyTypes);
          return (
            <div
              key={st.id}
              onClick={() => onEdit(st)}
              style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
              className={`p-4 rounded-xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/40 flex flex-col justify-between gap-3 group cursor-pointer transition-all`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        borderColor: `${typeDetails.color}40`,
                        backgroundColor: `${typeDetails.color}15`,
                        color: typeDetails.color,
                      }}
                    >
                      {st.code}
                    </span>
                    <span className={`text-xs font-bold text-white ${typeDetails.hoverTextClass} transition-colors`}>
                      {st.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onEdit(st)}
                      className={`text-zinc-400 ${typeDetails.hoverTextClass} p-1 rounded hover:bg-zinc-800 transition-all cursor-pointer`}
                      title={t("Story type en kwaliteitscriteria bewerken")}
                    >
                      <Edit2 className="size-3.5 transition-all group-hover:stroke-[2.75]" />
                    </button>
                    {!st.isDefault && (
                      <button
                        type="button"
                        onClick={() => onDelete(st.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("Verwijderen")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {st.description && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{st.description}</p>
                )}

                {/* Quality criteria count & preview */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                      <CheckSquare className="size-3.5 text-brand" />
                      <span>{t("Standaard kwaliteitscriteria")}:</span>
                    </span>
                    <span className="font-mono font-semibold text-zinc-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                      {criteriaCount}
                    </span>
                  </div>
                  {criteriaCount > 0 && (
                    <ul className="text-[11px] text-zinc-400 space-y-1 pl-1">
                      {st.defaultQualityCriteria!.slice(0, 3).map((crit, cIdx) => (
                        <li key={cIdx} className="truncate flex items-center gap-1 text-zinc-300">
                          <span className="text-brand/70 font-mono text-[10px]">
                            {crit.indent ? "↳" : "•"}
                          </span>
                          <span className="truncate">{crit.text}</span>
                        </li>
                      ))}
                      {criteriaCount > 3 && (
                        <li className="text-[10px] text-zinc-500 italic pl-2">
                          +{criteriaCount - 3} {t("overige criteria")}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {st.isDefault && (
                <span className="text-[10px] text-zinc-500 italic block">{t("Standaard type")}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
    </>
  );
}
