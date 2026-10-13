import { t } from "@/lib/lang";
import { formatNumberNl } from "@/lib/number-input";
import type { Measurement } from "./body-utils";

export function BodySummaryCards({
  latestLog,
  latestBmi,
  logCount,
}: {
  latestLog: Measurement | null;
  latestBmi: number | null;
  logCount: number;
}) {
  return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px] min-w-0">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{t("Weight")}</span>
            <span className="text-2xl sm:text-3xl font-black text-brand font-display mt-1 truncate">
              {latestLog?.weight ? `${formatNumberNl(latestLog.weight)} kg` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {latestLog ? latestLog.date : t("Geen metingen")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px] min-w-0">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{t("Body Fat")}</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-display mt-1 truncate">
              {latestLog?.bodyFat ? `${latestLog.bodyFat}%` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {latestLog?.fatMass ? `${formatNumberNl(latestLog.fatMass)} kg ${t("vetmassa")}` : t("Geen data")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px] min-w-0">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{t("Skeletal Muscle")}</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-display mt-1 truncate">
              {latestLog?.skeletalMuscle ? `${formatNumberNl(latestLog.skeletalMuscle)} kg` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {latestLog?.skeletalMuscle && latestLog?.weight ? `${formatNumberNl((latestLog.skeletalMuscle / latestLog.weight) * 100, 1)}%` : t("Skeletspiermassa")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px] min-w-0">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">BMI</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-display mt-1 truncate">
              {latestBmi !== null ? latestBmi : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {logCount} {logCount === 1 ? t("meting gelogd") : t("metingen gelogd")}
            </span>
          </div>
        </div>
  );
}
