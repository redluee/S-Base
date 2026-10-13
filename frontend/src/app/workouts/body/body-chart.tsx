import { TrendingUp } from "lucide-react";
import { t } from "@/lib/lang";
import { formatNumberNl } from "@/lib/number-input";
import { calculateBMI, type ChartTab, type Measurement } from "./body-utils";

export function BodyChart({ logs, chartTab }: { logs: Measurement[]; chartTab: ChartTab }) {
    const chartData = [...logs]
      .filter((l) => {
        if (chartTab === "weight") return l.weight !== null;
        if (chartTab === "fat") return l.bodyFat !== null;
        if (chartTab === "muscle") return l.skeletalMuscle !== null || l.fatMass !== null;
        if (chartTab === "bmi") return l.weight !== null && l.height !== null;
        return false;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (chartData.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 text-muted-foreground text-sm">
          <TrendingUp className="size-8 mb-2 opacity-30 text-brand" />
          <span>{t("Onvoldoende gegevens om grafiek te tekenen")}</span>
        </div>
      );
    }

    const width = 600;
    const height = 240;
    const padding = 50;

    let getVal1: (m: Measurement) => number = () => 0;
    let getVal2: (m: Measurement) => number = () => 0; 
    let label1 = "";
    let label2 = "";

    if (chartTab === "weight") {
      getVal1 = (m) => m.weight || 0;
      label1 = `${t("Weight")} (kg)`;
    } else if (chartTab === "fat") {
      getVal1 = (m) => m.bodyFat || 0;
      label1 = `${t("Body Fat")} (%)`;
    } else if (chartTab === "muscle") {
      getVal1 = (m) => m.skeletalMuscle || 0;
      getVal2 = (m) => m.fatMass || 0;
      label1 = `${t("Skeletal Muscle")} (kg)`;
      label2 = `${t("Fat Mass")} (kg)`;
    } else if (chartTab === "bmi") {
      getVal1 = (m) => calculateBMI(m.weight, m.height) || 0;
      label1 = "BMI";
    }

    const allVals = chartData.flatMap(m => {
      const v1 = getVal1(m);
      const v2 = getVal2(m);
      return v2 > 0 ? [v1, v2] : [v1];
    });
    const maxVal = Math.max(...allVals) * 1.05;
    const minVal = Math.max(0, Math.min(...allVals) * 0.95);
    const valRange = maxVal - minVal || 10;

    const points1 = chartData.map((m, idx) => {
      const x = padding + (idx / (chartData.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((getVal1(m) - minVal) / valRange) * (height - 2 * padding);
      return { x, y, val: getVal1(m), date: m.date };
    });

    const points2 = chartTab === "muscle" ? chartData.map((m, idx) => {
      const x = padding + (idx / (chartData.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (((getVal2(m) || minVal) - minVal) / valRange) * (height - 2 * padding);
      return { x, y, val: getVal2(m), date: m.date };
    }).filter(p => p.val > 0) : [];

    const pathD1 = points1.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD1 = points1.length > 0 ? `${pathD1} L ${points1[points1.length - 1].x} ${height - padding} L ${points1[0].x} ${height - padding} Z` : "";
    const pathD2 = points2.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-brand">
              <span className="size-2 rounded-full bg-brand" />
              {label1}
            </span>
            {chartTab === "muscle" && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <span className="size-2 rounded-full bg-amber-500" />
                {label2}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {chartData[0].date} {t("t/m")} {chartData[chartData.length - 1].date}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />

          {/* Y Axis labels */}
          <text x={padding - 12} y={padding + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{formatNumberNl(maxVal, 1)}</text>
          <text x={padding - 12} y={height / 2 + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{formatNumberNl((maxVal + minVal) / 2, 1)}</text>
          <text x={padding - 12} y={height - padding + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{formatNumberNl(minVal, 1)}</text>

          {/* Area Fill for line 1 */}
          {areaD1 && (
            <path d={areaD1} fill="url(#brand-gradient)" opacity={0.15} />
          )}

          {/* Line 1 */}
          <path d={pathD1} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Line 2 */}
          {chartTab === "muscle" && pathD2 && (
            <path d={pathD2} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots and Tooltips for Line 1 */}
          {points1.map((p, idx) => (
            <g key={`d1-${idx}`} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r={4.5} fill="var(--color-brand)" stroke="#000000" strokeWidth={1.5} className="transition-all group-hover/dot:r-6" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 55} y={p.y - 42} width={110} height={30} rx={6} fill="var(--color-card)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <text x={p.x} y={p.y - 22} fill="var(--color-foreground)" fontSize={12} fontWeight="700" textAnchor="middle">
                  {formatNumberNl(p.val, 1)} ({p.date.split("-").slice(1).join("-")})
                </text>
              </g>
            </g>
          ))}

          {/* Dots and Tooltips for Line 2 */}
          {points2.map((p, idx) => (
            <g key={`d2-${idx}`} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r={4.5} fill="#f59e0b" stroke="#000000" strokeWidth={1.5} className="transition-all group-hover/dot:r-6" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 55} y={p.y - 42} width={110} height={30} rx={6} fill="var(--color-card)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <text x={p.x} y={p.y - 22} fill="var(--color-foreground)" fontSize={12} fontWeight="700" textAnchor="middle">
                  {formatNumberNl(p.val, 1)} ({p.date.split("-").slice(1).join("-")})
                </text>
              </g>
            </g>
          ))}

          {/* Gradients */}
          <defs>
            <linearGradient id="brand-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
}
