"use client";

import { Calendar, AlertTriangle } from "lucide-react";
import { t } from "@/lib/lang";
import type { useSprintData } from "./use-sprint-data";

interface SprintBannersProps {
  hasFewLUs: boolean;
  missingLU5: boolean;
  uniqueLUsInSprint: Set<number>;
  data: ReturnType<typeof useSprintData>;
}

export function SprintBanners({ hasFewLUs, missingLU5, uniqueLUsInSprint, data }: SprintBannersProps) {
  const { sprint } = data;
  return (
    <div className="space-y-2">
      {sprint.extendedDays > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-emerald-400" />
          <span>
            {t("Verlengd met {days} vakantiedagen", { days: String(sprint.extendedDays) })} i.v.m. geregistreerde vakantieperiode ({sprint.extensionReason}).
          </span>
        </div>
      )}

      {(hasFewLUs || missingLU5) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
          <div className="space-y-0.5">
            {hasFewLUs && (
              <p>
                {t("Minder dan 3 leeruitkomsten geselecteerd in deze sprint.")} ({uniqueLUsInSprint.size} {t("geselecteerd")})
              </p>
            )}
            {missingLU5 && (
              <p>{t("Leeruitkomst 5 (LU 5) ontbreekt in deze sprint.")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
