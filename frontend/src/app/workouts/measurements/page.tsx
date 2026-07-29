"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { NavHeader } from "@/components/nav-header";
import { 
  Scale, 
  Plus, 
  Trash2, 
  Camera, 
  TrendingUp, 
  Calendar,
  X,
  ChevronLeft,
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

export default function MeasurementsPage() {
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
    // When date changes in edit mode, we can search if there's an existing log for that date
    // (but keep the editingId if they are editing or set to new date if editingId was 0)
    const existing = logs.find((l) => l.date === date && l.measurementId !== editingId);
    if (existing) {
      // If there is an existing log on that date, warn or switch to editing that instead
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
    
    // Check if we already have a log for today
    const existing = logs.find((l) => l.date === today);
    if (existing) {
      setEditingId(existing.measurementId);
      setFormHeight(existing.height?.toString() ?? "");
      setFormWeight(existing.weight?.toString() ?? "");
      setFormBodyFat(existing.bodyFat?.toString() ?? "");
      setFormSkeletalMuscle(existing.skeletalMuscle?.toString() ?? "");
      setFormFatMass(existing.fatMass?.toString() ?? "");
    } else {
      setEditingId(0); // 0 is new entry marker
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
        <div className="h-64 flex flex-col items-center justify-center border border-zinc-800/80 bg-zinc-900/20 rounded-2xl text-zinc-500 text-sm">
          <TrendingUp className="size-8 mb-2 opacity-30" />
          <span>Onvoldoende gegevens om grafiek te tekenen</span>
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
      label1 = "Gewicht (kg)";
    } else if (chartTab === "fat") {
      getVal1 = (m) => m.bodyFat || 0;
      label1 = "Vetpercentage (%)";
    } else if (chartTab === "muscle") {
      getVal1 = (m) => m.skeletalMuscle || 0;
      getVal2 = (m) => m.fatMass || 0;
      label1 = "Skeletspier (kg)";
      label2 = "Vetmassa (kg)";
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
      <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
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
          <span className="text-xs text-zinc-500 font-semibold">
            {chartData[0].date} t/m {chartData[chartData.length - 1].date}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#3f3f46" strokeWidth={1} />

          {/* Y Axis labels */}
          <text x={padding - 12} y={padding + 5} fill="#a1a1aa" fontSize={14} fontWeight="bold" textAnchor="end">{maxVal.toFixed(1)}</text>
          <text x={padding - 12} y={height / 2 + 5} fill="#a1a1aa" fontSize={14} fontWeight="bold" textAnchor="end">{((maxVal + minVal) / 2).toFixed(1)}</text>
          <text x={padding - 12} y={height - padding + 5} fill="#a1a1aa" fontSize={14} fontWeight="bold" textAnchor="end">{minVal.toFixed(1)}</text>

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
              <circle cx={p.x} cy={p.y} r={4.5} fill="#00e3a4" stroke="#09090b" strokeWidth={1.5} className="transition-all group-hover/dot:r-7" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 55} y={p.y - 42} width={110} height={30} rx={6} fill="#18181b" stroke="#27272a" strokeWidth={1.5} />
                <text x={p.x} y={p.y - 22} fill="#ffffff" fontSize={13} fontWeight="bold" textAnchor="middle">
                  {p.val.toFixed(1)} ({p.date.split("-").slice(1).join("-")})
                </text>
              </g>
            </g>
          ))}

          {/* Dots and Tooltips for Line 2 */}
          {points2.map((p, idx) => (
            <g key={`d2-${idx}`} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r={4.5} fill="#f59e0b" stroke="#09090b" strokeWidth={1.5} className="transition-all group-hover/dot:r-7" />
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 55} y={p.y - 42} width={110} height={30} rx={6} fill="#18181b" stroke="#27272a" strokeWidth={1.5} />
                <text x={p.x} y={p.y - 22} fill="#ffffff" fontSize={13} fontWeight="bold" textAnchor="middle">
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
      <div className="min-h-screen flex flex-col bg-zinc-950 text-foreground">
        <NavHeader username={user?.username ?? ""} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="size-8 text-brand animate-spin" />
          <span className="text-zinc-500 text-sm mt-3">Metingen laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-foreground">
      <NavHeader username={user.username} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-semibold uppercase tracking-wider mb-2 cursor-pointer" onClick={() => router.push("/workouts")}>
              <ChevronLeft className="size-4" />
              Terug naar Workout Studio
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-zinc-100 tracking-tight">
              {t("Weight & Measurements")}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {t("Body measurements & progress tracking")}
            </p>
          </div>

          <Button 
            onClick={handleNewEntry} 
            disabled={editingId === 0}
            className="bg-brand text-zinc-900 hover:bg-brand/90 active:scale-[0.98] transition-all font-bold px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-[0_0_2rem_-0.5rem_rgba(0,227,164,0.3)] cursor-pointer"
          >
            <Plus className="size-4" />
            {t("Log Entry")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inline Logs & Editing */}
          <section className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-black text-xl text-zinc-300">
                Logboek
              </h3>

              {displayLogs.length === 0 ? (
                <div className="border border-zinc-800/80 bg-zinc-900/10 rounded-3xl p-12 text-center text-zinc-500">
                  <Scale className="size-12 mx-auto mb-3 opacity-20" />
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
                        <div key={log.measurementId} className="bg-zinc-900/60 border border-brand/50 rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />
                          <form onSubmit={handleSave} className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{t("Date")}</label>
                                <input 
                                  type="date" 
                                  required
                                  value={formDate} 
                                  onChange={(e) => handleDateChange(e.target.value)}
                                  className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-200 focus:outline-none focus:border-brand transition-colors"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{t("Height")}</label>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  min="0"
                                  placeholder="cm"
                                  value={formHeight}
                                  onKeyDown={preventInvalidInput}
                                  onChange={(e) => setFormHeight(e.target.value)}
                                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors"
                                />
                              </div>
                              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{t("Weight")}</label>
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
                                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors"
                                />
                              </div>
                              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{t("Body Fat")}</label>
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
                                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors"
                                />
                              </div>
                              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{t("Skeletal Muscle")}</label>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  min="0"
                                  placeholder="kg"
                                  value={formSkeletalMuscle}
                                  onKeyDown={preventInvalidInput}
                                  onChange={(e) => setFormSkeletalMuscle(e.target.value)}
                                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors"
                                />
                              </div>
                              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{t("Fat Mass")}</label>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  disabled
                                  placeholder="Automatisch"
                                  value={formFatMass}
                                  className="w-full bg-zinc-950/20 border border-zinc-850 rounded-lg px-2 py-1 text-xs text-zinc-400 cursor-not-allowed opacity-75"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <Button 
                                type="button" 
                                onClick={handleCancelEdit} 
                                variant="outline"
                                className="border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 font-semibold rounded-xl text-xs py-1.5 h-8 cursor-pointer"
                              >
                                Annuleren
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={isSaving}
                                className="bg-brand text-zinc-900 hover:bg-brand/90 font-bold rounded-xl text-xs py-1.5 h-8 px-4 cursor-pointer"
                              >
                                {isSaving ? "Opslaan..." : "Opslaan"}
                              </Button>
                            </div>
                          </form>
                        </div>
                      );
                    }

                    // Standard read-only card block
                    return (
                      <div key={log.measurementId} className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 transition-all hover:border-zinc-700/50">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4.5 text-brand" />
                            <span className="font-display font-black text-lg text-zinc-200">{log.date}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditEntry(log)}
                              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                              title="Bewerken"
                            >
                              <Pencil className="size-4 text-brand" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLog(log.measurementId)}
                              className="p-1.5 rounded-lg border border-zinc-800/80 hover:border-red-900/50 hover:bg-red-950/10 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                              title="Verwijderen"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {/* Metric Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                          {log.height && (
                            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5 text-center">
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t("Height")}</span>
                              <span className="font-display font-black text-sm text-zinc-200">{log.height} cm</span>
                            </div>
                          )}
                          {log.weight && (
                            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5 text-center">
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t("Weight")}</span>
                              <span className="font-display font-black text-sm text-zinc-200">{log.weight} kg</span>
                            </div>
                          )}
                          {log.bodyFat && (
                            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5 text-center">
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t("Body Fat")}</span>
                              <span className="font-display font-black text-sm text-zinc-200">{log.bodyFat}%</span>
                            </div>
                          )}
                          {log.skeletalMuscle && (
                            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5 text-center">
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t("Skeletal Muscle")}</span>
                              <span className="font-display font-black text-sm text-zinc-200">{log.skeletalMuscle} kg</span>
                            </div>
                          )}
                          {log.fatMass && (
                            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-2.5 text-center">
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t("Fat Mass")}</span>
                              <span className="font-display font-black text-sm text-zinc-200">{log.fatMass} kg</span>
                            </div>
                          )}
                        </div>

                        {/* BMI and Photos container */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
                          {bmi ? (
                            <div className="flex items-center gap-1.5 text-base">
                              <span className="font-display font-black text-zinc-500">BMI:</span>
                              <span className="font-display font-black text-zinc-200">{bmi}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-600 font-medium">BMI niet beschikbaar</div>
                          )}

                          {/* Photos uploads */}
                          <div className="flex items-center gap-2.5 overflow-x-auto">
                            {log.photos.map((p) => (
                              <div key={p.photoId} className="relative group/photo shrink-0 size-12 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
                                <img 
                                  src={p.filePath} 
                                  alt="Meting foto" 
                                  onClick={() => setActivePhotoUrl(p.filePath)}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                                />
                                <button 
                                  onClick={() => handleDeletePhoto(p.photoId)}
                                  className="absolute top-0.5 right-0.5 size-4 rounded bg-red-600/90 border border-red-500/30 flex items-center justify-center text-white opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-500 cursor-pointer"
                                >
                                  <X className="size-2.5" />
                                </button>
                              </div>
                            ))}

                            <label className="shrink-0 size-12 rounded-xl border border-dashed border-zinc-800 hover:border-brand/50 flex flex-col items-center justify-center text-zinc-600 hover:text-brand bg-zinc-950/20 hover:bg-brand/5 transition-all cursor-pointer">
                              <Camera className="size-5" />
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

            </div>
          </section>

          {/* Right Column: Graphs */}
          <section className="lg:col-span-5 flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-xl text-zinc-300">
                Statistieken & Voortgang
              </h3>
            </div>

            {/* Tab switchers */}
            <div className="flex border-b border-zinc-800/80">
              <button 
                onClick={() => setChartTab("weight")}
                className={`flex-1 pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                  chartTab === "weight" ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Gewicht
              </button>
              <button 
                onClick={() => setChartTab("fat")}
                className={`flex-1 pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                  chartTab === "fat" ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Vet%
              </button>
              <button 
                onClick={() => setChartTab("muscle")}
                className={`flex-1 pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                  chartTab === "muscle" ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Massa
              </button>
              <button 
                onClick={() => setChartTab("bmi")}
                className={`flex-1 pb-3 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                  chartTab === "bmi" ? "border-brand text-brand" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                BMI
              </button>
            </div>

            {renderChart()}
          </section>

        </div>
      </main>

      {/* Lightbox photo viewer */}
      {activePhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200">
          <button 
            onClick={() => setActivePhotoUrl(null)} 
            className="absolute top-6 right-6 size-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="size-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <img src={activePhotoUrl} alt="Meting groot scherm" className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
