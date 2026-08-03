/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { NavHeader } from "@/components/nav-header";
import { WorkoutSubnav } from "@/components/workout-subnav";
import { 
  Scale, 
  Plus, 
  Trash2, 
  Camera, 
  TrendingUp, 
  Calendar,
  X,
  Loader2,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Photo {
  photoId: number;
  measurementId: number;
  filePath: string;
  createdAt: string;
}

interface Measurement {
  measurementId: number;
  userId: number;
  date: string;
  height: number | null;
  weight: number | null;
  bodyFat: number | null;
  skeletalMuscle: number | null;
  fatMass: number | null;
  createdAt: string;
  photos: Photo[];
}

export default function BodyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [logs, setLogs] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State (used for both inline edit and new prepended entry)
  const [editingId, setEditingId] = useState<number | null>(null); // null, 0 for new, or measurementId for editing
  const [formDate, setFormDate] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formBodyFat, setFormBodyFat] = useState("");
  const [formSkeletalMuscle, setFormSkeletalMuscle] = useState("");
  const [formFatMass, setFormFatMass] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Photo viewer state
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Chart state
  const [chartTab, setChartTab] = useState<"weight" | "fat" | "muscle" | "bmi">("weight");

  const fetchLogs = () => {
    setLoading(true);
    api.measurements.list()
      .then((data) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load measurements:", err);
        setLoading(false);
      });
  };

  // Load user and data
  useEffect(() => {
    api.me()
      .then((res) => {
        setUser(res.user);
        api.measurements.list()
          .then((data) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setLogs(sorted);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Failed to load measurements:", err);
            setLoading(false);
          });
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  const getAutofilledHeight = (date: string, currentLogs: Measurement[]) => {
    const sortedPast = [...currentLogs]
      .filter((l) => l.date <= date && l.height !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sortedPast.length > 0 && sortedPast[0].height ? sortedPast[0].height.toString() : "";
  };

  const updateCalculatedFatMass = (w: string, bf: string) => {
    const weightNum = parseFloat(w);
    const fatPctNum = parseFloat(bf);
    if (!isNaN(weightNum) && !isNaN(fatPctNum)) {
      setFormFatMass(((weightNum * fatPctNum) / 100).toFixed(1));
    } else {
      setFormFatMass("");
    }
  };

  const handleDateChange = (date: string) => {
    setFormDate(date);
    const existing = logs.find((l) => l.date === date && l.measurementId !== editingId);
    if (existing) {
      setFormHeight(existing.height?.toString() ?? "");
      setFormWeight(existing.weight?.toString() ?? "");
      setFormBodyFat(existing.bodyFat?.toString() ?? "");
      setFormSkeletalMuscle(existing.skeletalMuscle?.toString() ?? "");
      setFormFatMass(existing.fatMass?.toString() ?? "");
    } else {
      setFormHeight(getAutofilledHeight(date, logs));
    }
  };

  // Open form for a new entry
  const handleNewEntry = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormDate(today);
    
    const existing = logs.find((l) => l.date === today);
    if (existing) {
      setEditingId(existing.measurementId);
      setFormHeight(existing.height?.toString() ?? "");
      setFormWeight(existing.weight?.toString() ?? "");
      setFormBodyFat(existing.bodyFat?.toString() ?? "");
      setFormSkeletalMuscle(existing.skeletalMuscle?.toString() ?? "");
      setFormFatMass(existing.fatMass?.toString() ?? "");
    } else {
      setEditingId(0);
      setFormWeight("");
      setFormBodyFat("");
      setFormSkeletalMuscle("");
      setFormFatMass("");
      setFormHeight(getAutofilledHeight(today, logs));
    }
  };

  // Open form to edit an existing entry
  const handleEditEntry = (log: Measurement) => {
    setEditingId(log.measurementId);
    setFormDate(log.date);
    setFormHeight(log.height?.toString() ?? "");
    setFormWeight(log.weight?.toString() ?? "");
    setFormBodyFat(log.bodyFat?.toString() ?? "");
    setFormSkeletalMuscle(log.skeletalMuscle?.toString() ?? "");
    setFormFatMass(log.fatMass?.toString() ?? "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Save current log
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) return;

    setIsSaving(true);
    try {
      const data = {
        date: formDate,
        height: formHeight ? parseFloat(formHeight) : null,
        weight: formWeight ? parseFloat(formWeight) : null,
        bodyFat: formBodyFat ? parseFloat(formBodyFat) : null,
        skeletalMuscle: formSkeletalMuscle ? parseFloat(formSkeletalMuscle) : null,
        fatMass: formFatMass ? parseFloat(formFatMass) : null,
      };

      await api.measurements.save(data);
      setEditingId(null);
      fetchLogs();
    } catch (err) {
      console.error("Failed to save log:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete measurement
  const handleDeleteLog = async (id: number) => {
    if (!confirm(t("Are you sure you want to delete this log?"))) return;

    try {
      await api.measurements.delete(id);
      if (editingId === id) {
        setEditingId(null);
      }
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetLog: Measurement) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { filePath } = await api.measurements.uploadPhoto(file);
      
      await fetch(`/api/measurements/${targetLog.measurementId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      fetchLogs();
    } catch (err) {
      console.error("Failed to upload photo:", err);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: number) => {
    try {
      await api.measurements.deletePhoto(photoId);
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  };

  // Calculate BMI: weight / (height/100)^2
  const calculateBMI = (weight: number | null, height: number | null): number | null => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const preventInvalidInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Prepend mock log if creating a new one
  const displayLogs = editingId === 0 ? [
    {
      measurementId: 0,
      userId: user?.id ?? 0,
      date: formDate,
      height: formHeight ? parseFloat(formHeight) : null,
      weight: formWeight ? parseFloat(formWeight) : null,
      bodyFat: formBodyFat ? parseFloat(formBodyFat) : null,
      skeletalMuscle: formSkeletalMuscle ? parseFloat(formSkeletalMuscle) : null,
      fatMass: formFatMass ? parseFloat(formFatMass) : null,
      createdAt: "",
      photos: []
    },
    ...logs
  ] : logs;

  // Latest measurement for summary dashboard
  const latestLog = logs.length > 0 ? logs[0] : null;
  const latestBmi = latestLog ? calculateBMI(latestLog.weight, latestLog.height) : null;

  // SVG Custom Chart Rendering helper
  const renderChart = () => {
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
          <text x={padding - 12} y={padding + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{maxVal.toFixed(1)}</text>
          <text x={padding - 12} y={height / 2 + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{((maxVal + minVal) / 2).toFixed(1)}</text>
          <text x={padding - 12} y={height - padding + 4} fill="var(--color-muted)" fontSize={12} fontWeight="600" textAnchor="end">{minVal.toFixed(1)}</text>

          {/* Area Fill for line 1 */}
          {areaD1 && (
            <path d={areaD1} fill="url(#brand-gradient)" opacity={0.15} />
          )}

          {/* Line 1 */}
          <path d={pathD1} fill="none" stroke="#00e3a4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Line 2 */}
          {chartTab === "muscle" && pathD2 && (
            <path d={pathD2} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots and Tooltips for Line 1 */}
          {points1.map((p, idx) => (
            <g key={`d1-${idx}`} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r={4.5} fill="#00e3a4" stroke="#000000" strokeWidth={1.5} className="transition-all group-hover/dot:r-6" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 55} y={p.y - 42} width={110} height={30} rx={6} fill="var(--color-card)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <text x={p.x} y={p.y - 22} fill="var(--color-foreground)" fontSize={12} fontWeight="700" textAnchor="middle">
                  {p.val.toFixed(1)} ({p.date.split("-").slice(1).join("-")})
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
                  {p.val.toFixed(1)} ({p.date.split("-").slice(1).join("-")})
                </text>
              </g>
            </g>
          ))}

          {/* Gradients */}
          <defs>
            <linearGradient id="brand-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e3a4" />
              <stop offset="100%" stopColor="#00e3a4" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <NavHeader username={user?.username ?? ""} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="size-8 text-brand animate-spin" />
          <span className="text-muted-foreground text-sm mt-3">{t("Metingen laden...")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavHeader username={user.username} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2.5">
            <Scale className="size-6 sm:size-7 text-brand" />
            <span>{t("Body")}</span>
          </h1>

          <WorkoutSubnav current="body" />
        </div>

        {/* Summary Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("Weight")}</span>
            <span className="text-2xl sm:text-3xl font-black text-brand font-display mt-1">
              {latestLog?.weight ? `${latestLog.weight} kg` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {latestLog ? latestLog.date : t("Geen metingen")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("Body Fat")}</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-display mt-1">
              {latestLog?.bodyFat ? `${latestLog.bodyFat}%` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {latestLog?.fatMass ? `${latestLog.fatMass} kg ${t("vetmassa")}` : t("Geen data")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("Skeletal Muscle")}</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-display mt-1">
              {latestLog?.skeletalMuscle ? `${latestLog.skeletalMuscle} kg` : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {t("Skeletspiermassa")}
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[100px]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">BMI</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground font-display mt-1">
              {latestBmi !== null ? latestBmi : "-"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {logs.length} {logs.length === 1 ? t("meting gelogd") : t("metingen gelogd")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inline Logs & Editing */}
          <section className="lg:col-span-7 flex flex-col gap-5 order-2 lg:order-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("Logboek")}
              </h2>
              <Button 
                onClick={handleNewEntry} 
                disabled={editingId === 0}
                size="sm"
                className="bg-brand text-zinc-900 hover:bg-brand-hover active:scale-[0.97] transition-all font-medium text-xs h-8 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                {t("Meting")}
              </Button>
            </div>

            {displayLogs.length === 0 ? (
              <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-12 text-center text-muted-foreground">
                <Scale className="size-12 mx-auto mb-3 opacity-20 text-brand" />
                <p className="font-medium text-sm">{t("No measurements logged yet.")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {displayLogs.map((log) => {
                  const isEditing = editingId === log.measurementId;
                  const bmi = calculateBMI(log.weight, log.height);

                  if (isEditing) {
                    // Editable card block
                    return (
                      <div key={log.measurementId} className="rounded-xl bg-card ring-1 ring-brand/50 p-5 sm:p-6 transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
                        <form onSubmit={handleSave} className="space-y-4 relative z-10">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">{t("Date")}</label>
                              <input 
                                type="date" 
                                required
                                value={formDate} 
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5">
                              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{t("Height")}</label>
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                placeholder="cm"
                                value={formHeight}
                                onKeyDown={preventInvalidInput}
                                onChange={(e) => setFormHeight(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                              />
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5">
                              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{t("Weight")}</label>
                              <input 
                                type="number" 
                                step="0.05" 
                                min="0"
                                placeholder="kg"
                                value={formWeight}
                                onKeyDown={preventInvalidInput}
                                onChange={(e) => {
                                  setFormWeight(e.target.value);
                                  updateCalculatedFatMass(e.target.value, formBodyFat);
                                }}
                                className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                              />
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5">
                              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{t("Body Fat")}</label>
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                placeholder="%"
                                value={formBodyFat}
                                onKeyDown={preventInvalidInput}
                                onChange={(e) => {
                                  setFormBodyFat(e.target.value);
                                  updateCalculatedFatMass(formWeight, e.target.value);
                                }}
                                className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                              />
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5">
                              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{t("Skeletal Muscle")}</label>
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                placeholder="kg"
                                value={formSkeletalMuscle}
                                onKeyDown={preventInvalidInput}
                                onChange={(e) => setFormSkeletalMuscle(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                              />
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5">
                              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{t("Fat Mass")}</label>
                              <input 
                                type="number" 
                                step="0.1" 
                                disabled
                                placeholder="Auto"
                                value={formFatMass}
                                className="w-full bg-background/30 border border-border/40 rounded-md px-2 py-1 text-xs text-muted-foreground cursor-not-allowed opacity-75"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button 
                              type="button" 
                              onClick={handleCancelEdit} 
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 cursor-pointer"
                            >
                              {t("Annuleren")}
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={isSaving}
                              size="sm"
                              className="bg-brand text-zinc-900 hover:bg-brand-hover font-medium text-xs h-8 px-4 cursor-pointer"
                            >
                              {isSaving ? t("Opslaan...") : t("Opslaan")}
                            </Button>
                          </div>
                        </form>
                      </div>
                    );
                  }

                  // Standard read-only card block
                  return (
                    <div key={log.measurementId} className="rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-brand" />
                          <span className="font-display font-bold text-base text-foreground">{log.date}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleEditEntry(log)}
                            className="size-8 text-muted-foreground hover:text-brand cursor-pointer"
                            title={t("Bewerken")}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteLog(log.measurementId)}
                            className="size-8 text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer"
                            title={t("Verwijderen")}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Metric Chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
                        {log.height && (
                          <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center">
                            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("Height")}</span>
                            <span className="font-display font-bold text-sm text-foreground">{log.height} cm</span>
                          </div>
                        )}
                        {log.weight && (
                          <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center">
                            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("Weight")}</span>
                            <span className="font-display font-bold text-sm text-brand">{log.weight} kg</span>
                          </div>
                        )}
                        {log.bodyFat && (
                          <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center">
                            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("Body Fat")}</span>
                            <span className="font-display font-bold text-sm text-foreground">{log.bodyFat}%</span>
                          </div>
                        )}
                        {log.skeletalMuscle && (
                          <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center">
                            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("Skeletal Muscle")}</span>
                            <span className="font-display font-bold text-sm text-amber-400">{log.skeletalMuscle} kg</span>
                          </div>
                        )}
                        {log.fatMass && (
                          <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center">
                            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("Fat Mass")}</span>
                            <span className="font-display font-bold text-sm text-foreground">{log.fatMass} kg</span>
                          </div>
                        )}
                      </div>

                      {/* BMI and Photos container */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/50 pt-3.5">
                        {bmi ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <span>BMI:</span>
                            <span className="font-display font-bold text-foreground text-sm">{bmi}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/60">{t("BMI niet beschikbaar")}</div>
                        )}

                        {/* Photos uploads */}
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {log.photos.map((p) => (
                            <div key={p.photoId} className="relative group/photo shrink-0 size-11 rounded-lg border border-border overflow-hidden bg-background">
                              <img 
                                src={p.filePath} 
                                alt="Meting foto" 
                                onClick={() => setActivePhotoUrl(p.filePath)}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                              />
                              <button 
                                onClick={() => handleDeletePhoto(p.photoId)}
                                className="absolute top-0.5 right-0.5 size-4 rounded bg-destructive/90 flex items-center justify-center text-white opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          ))}

                          <label className="shrink-0 size-11 rounded-lg border border-dashed border-border hover:border-brand/50 flex flex-col items-center justify-center text-muted-foreground hover:text-brand bg-muted/10 hover:bg-brand/5 transition-all cursor-pointer">
                            <Camera className="size-4" />
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, log)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </section>

          {/* Right Column: Graphs */}
          <section className="lg:col-span-5 flex flex-col gap-5 order-1 lg:order-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("Statistieken & Voortgang")}
              </h2>
            </div>

            {/* Tab switchers */}
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { id: "weight", label: t("Gewicht") },
                { id: "fat", label: t("Vet%") },
                { id: "muscle", label: t("Massa") },
                { id: "bmi", label: "BMI" },
              ].map((tab) => {
                const isActive = chartTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setChartTab(tab.id as "weight" | "fat" | "muscle" | "bmi")}
                    className={`m-[2px] inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? "bg-brand/15 text-brand ring-1 ring-brand/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {renderChart()}
          </section>

        </div>
      </main>

      {/* Lightbox photo viewer */}
      {activePhotoUrl && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200">
          <button 
            onClick={() => setActivePhotoUrl(null)} 
            className="absolute top-6 right-6 size-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-card">
            <img src={activePhotoUrl} alt="Meting groot scherm" className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
