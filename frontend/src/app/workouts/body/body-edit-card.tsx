import { Ruler, ChevronDown, ChevronUp } from "lucide-react";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { preventInvalidInput, type CircumferenceKey, type FormValues } from "./body-utils";

const mainInputClass =
  "w-full bg-background border border-border rounded-md px-2 min-h-11 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand transition-colors";
const mainBoxClass = "bg-muted/30 border border-border/50 rounded-lg p-2.5";
const mainLabelClass = "block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1";

function circumferenceFields(): { key: CircumferenceKey; label: string }[] {
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

interface BodyEditCardProps {
  form: FormValues;
  formDate: string;
  onDateChange: (date: string) => void;
  onFieldChange: (key: keyof FormValues, value: string) => void;
  showBodyCircumferences: boolean;
  setShowBodyCircumferences: (v: boolean) => void;
  saveError: string | null;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function BodyEditCard({
  form,
  formDate,
  onDateChange,
  onFieldChange,
  showBodyCircumferences,
  setShowBodyCircumferences,
  saveError,
  isSaving,
  onSubmit,
  onCancel,
}: BodyEditCardProps) {
  const mainFields: { key: keyof FormValues; label: string; placeholder: string }[] = [
    { key: "height", label: t("Height"), placeholder: "cm" },
    { key: "weight", label: t("Weight"), placeholder: "kg" },
    { key: "bodyFat", label: t("Body Fat"), placeholder: "%" },
    { key: "skeletalMuscle", label: t("Skeletal Muscle"), placeholder: "kg" },
  ];

  return (
    <div className="rounded-xl bg-card ring-1 ring-brand/50 p-5 sm:p-6 transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
      <form onSubmit={onSubmit} className="space-y-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t("Date")}</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 min-h-11 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {mainFields.map((f) => (
            <div key={f.key} className={mainBoxClass}>
              <label className={mainLabelClass}>{f.label}</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder={f.placeholder}
                value={form[f.key]}
                onKeyDown={preventInvalidInput}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
                className={mainInputClass}
              />
            </div>
          ))}
          <div className={mainBoxClass}>
            <label className={mainLabelClass}>{t("Fat Mass")}</label>
            <input
              type="number"
              step="any"
              disabled
              placeholder="Auto"
              value={form.fatMass}
              className="w-full bg-background/30 border border-border/40 rounded-md px-2 min-h-11 text-sm text-muted-foreground cursor-not-allowed opacity-75"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowBodyCircumferences(!showBodyCircumferences)}
            aria-expanded={showBodyCircumferences}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover transition-colors min-h-11 cursor-pointer"
          >
            <Ruler className="size-3.5" />
            <span>{showBodyCircumferences ? t("Lichaamsmetingen verbergen") : t("+ Lichaamsmetingen toevoegen")}</span>
            {showBodyCircumferences ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showBodyCircumferences && (
            <div className="mt-3 p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-2.5 animate-in fade-in duration-200">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {t("Lichaamsmetingen")} (cm)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {circumferenceFields().map((f) => (
                  <div key={f.key} className="bg-background border border-border/60 rounded-md p-2">
                    <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">{f.label}</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="cm"
                      value={form[f.key]}
                      onKeyDown={preventInvalidInput}
                      onChange={(e) => onFieldChange(f.key, e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {saveError && (
          <p role="alert" className="text-xs text-red-400">{saveError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="button" 
            onClick={onCancel} 
            variant="outline"
            size="sm"
            className="text-sm min-h-11 cursor-pointer"
          >
            {t("Annuleren")}
          </Button>
          <Button 
            type="submit" 
            disabled={isSaving}
            size="sm"
            className="bg-brand text-zinc-900 hover:bg-brand-hover font-medium text-sm min-h-11 px-4 cursor-pointer"
          >
            {isSaving ? t("Opslaan...") : t("Opslaan")}
          </Button>
        </div>
      </form>
    </div>
  );
}
