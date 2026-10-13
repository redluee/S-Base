/* eslint-disable @next/next/no-img-element */
import { Calendar, Camera, Loader2, Pencil, Ruler, Trash2, X } from "lucide-react";
import { t } from "@/lib/lang";
import { formatNumberNl } from "@/lib/number-input";
import { Button } from "@/components/ui/button";
import { calculateBMI, hasCircumferences, type CircumferenceKey, type Measurement } from "./body-utils";

function circumferenceLabels(): { key: CircumferenceKey; label: string }[] {
  return [
    { key: "waist", label: t("Middel") },
    { key: "chest", label: t("Borst") },
    { key: "hips", label: t("Heupen") },
    { key: "biceps", label: t("Biceps") },
    { key: "thighs", label: t("Bovenbenen") },
    { key: "shoulders", label: t("Schouders") },
    { key: "neck", label: t("Nek") },
    { key: "calves", label: t("Kuiten") },
  ];
}

interface BodyLogCardProps {
  log: Measurement;
  onEdit: (log: Measurement) => void;
  onDelete: (id: number) => void;
  onViewPhoto: (url: string) => void;
  onDeletePhoto: (photoId: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, log: Measurement) => void;
  uploadingLogId: number | null;
  optimisticPhotoUrl: string | null;
  uploadStage: "idle" | "optimizing" | "uploading";
  uploadProgress: number;
}

export function BodyLogCard({
  log,
  onEdit,
  onDelete,
  onViewPhoto,
  onDeletePhoto,
  onUpload,
  uploadingLogId,
  optimisticPhotoUrl,
  uploadStage,
  uploadProgress,
}: BodyLogCardProps) {
  const bmi = calculateBMI(log.weight, log.height);
                  const fatPct = log.bodyFat !== null ? `${formatNumberNl(log.bodyFat)}%` : (log.fatMass !== null && log.weight ? `${formatNumberNl((log.fatMass / log.weight) * 100, 1)}%` : null);
                  const fatKg = log.fatMass !== null ? `${formatNumberNl(log.fatMass)} kg` : (log.bodyFat !== null && log.weight ? `${formatNumberNl((log.weight * log.bodyFat) / 100, 1)} kg` : null);
                  const fatDisplay = fatPct && fatKg ? `${fatPct} (${fatKg})` : (fatPct || fatKg || null);

                  const muscleKg = log.skeletalMuscle !== null ? `${formatNumberNl(log.skeletalMuscle)} kg` : null;
                  const musclePct = log.skeletalMuscle !== null && log.weight ? `${formatNumberNl((log.skeletalMuscle / log.weight) * 100, 1)}%` : null;
                  const muscleDisplay = musclePct && muscleKg ? `${musclePct} (${muscleKg})` : (musclePct || muscleKg || null);


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
              onClick={() => onEdit(log)}
              className="size-11 text-muted-foreground hover:text-brand cursor-pointer"
              title={t("Bewerken")}
              aria-label={t("Bewerken")}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onDelete(log.measurementId)}
              className="size-11 text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer"
              title={t("Verwijderen")}
              aria-label={t("Verwijderen")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {log.height && (
            <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center min-w-0">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">{t("Height")}</span>
              <span className="font-display font-bold text-sm text-foreground block truncate">{log.height} cm</span>
            </div>
          )}
          {log.weight && (
            <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center min-w-0">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">{t("Weight")}</span>
              <span className="font-display font-bold text-sm text-brand block truncate">{formatNumberNl(log.weight ?? 0)} kg</span>
            </div>
          )}
          {fatDisplay && (
            <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center min-w-0">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">{t("Body Fat")}</span>
              <span className="font-display font-bold text-sm text-foreground block truncate" title={fatDisplay}>{fatDisplay}</span>
            </div>
          )}
          {muscleDisplay && (
            <div className="bg-muted/30 ring-1 ring-foreground/5 rounded-lg p-2.5 text-center min-w-0">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">{t("Skeletal Muscle")}</span>
              <span className="font-display font-bold text-sm text-amber-400 block truncate" title={muscleDisplay}>{muscleDisplay}</span>
            </div>
          )}
        </div>

        {/* Recorded Circumferences Sub-section */}
        {hasCircumferences(log) && (
        <div className="mb-4 pt-3 border-t border-border/40">
          <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
            <Ruler className="size-3 text-brand" />
            {t("Lichaamsmetingen")}
          </span>
          <div className="flex flex-wrap gap-2">
            {circumferenceLabels().map(
              (f) =>
                log[f.key] && (
                  <span key={f.key} className="bg-muted/40 ring-1 ring-foreground/5 rounded-md px-2.5 py-1 text-xs font-medium text-foreground">
                    <span className="text-muted-foreground mr-1">{f.label}:</span> {log[f.key]} cm
                  </span>
                )
            )}
          </div>
        </div>
      )}

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
                <button
                  type="button"
                  onClick={() => onViewPhoto(p.filePath)}
                  aria-label={t("Bekijk foto groot")}
                  className="absolute inset-0 w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <img
                    src={p.filePath}
                    alt="Meting foto"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </button>
                <button 
                  type="button"
                  onClick={() => onDeletePhoto(p.photoId)}
                  aria-label={t("Foto verwijderen")}
                  className="absolute top-0.5 right-0.5 size-5 rounded bg-destructive/90 flex items-center justify-center text-white [@media(hover:hover)]:opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {/* Uploading optimistic thumbnail */}
            {uploadingLogId === log.measurementId && (
              <div className="relative shrink-0 size-11 rounded-lg border border-brand/60 overflow-hidden bg-background flex flex-col items-center justify-center animate-in fade-in duration-200">
                {optimisticPhotoUrl ? (
                  <img src={optimisticPhotoUrl} alt={t("Voorbeeld")} className="w-full h-full object-cover opacity-35" />
                ) : null}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-0.5">
                  <Loader2 className="size-3.5 text-brand animate-spin" />
                  <span className="text-[9px] font-extrabold text-foreground tracking-tighter">
                    {uploadStage === "optimizing" ? "..." : `${uploadProgress}%`}
                  </span>
                </div>
              </div>
            )}

            <label className={`shrink-0 size-11 rounded-lg border border-dashed border-border flex flex-col items-center justify-center transition-all ${
              uploadingLogId !== null
                ? "opacity-50 cursor-not-allowed bg-muted/5 text-muted-foreground"
                : "hover:border-brand/50 text-muted-foreground hover:text-brand bg-muted/10 hover:bg-brand/5 cursor-pointer"
            }`}>
              <Camera className="size-4" aria-hidden="true" />
              <span className="sr-only">{t("Foto toevoegen")}</span>
              <input 
                type="file" 
                accept="image/*"
                disabled={uploadingLogId !== null}
                onChange={(e) => onUpload(e, log)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

      </div>
  );
}
