"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { t } from "@/lib/lang";

interface PersonalRecord {
  exerciseName: string;
  prevWeight: number;
  newWeight: number;
  isDistance: boolean;
}

interface WorkoutCompletionSummaryProps {
  sessionName: string;
  setSessionName: (name: string) => void;
  summaryNotes: string;
  setSummaryNotes: (notes: string) => void;
  summaryHours: string;
  setSummaryHours: (h: string) => void;
  summaryMinutes: string;
  setSummaryMinutes: (m: string) => void;
  summarySeconds: string;
  setSummarySeconds: (s: string) => void;
  totalVolume: number;
  personalRecords: PersonalRecord[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDiscard: () => void;
}

export function WorkoutCompletionSummary({
  sessionName,
  setSessionName,
  summaryNotes,
  setSummaryNotes,
  summaryHours,
  setSummaryHours,
  summaryMinutes,
  setSummaryMinutes,
  summarySeconds,
  setSummarySeconds,
  totalVolume,
  personalRecords,
  saving,
  onSave,
  onCancel,
  onDiscard,
}: WorkoutCompletionSummaryProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2 flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1">
          {t("Workout Review & Edits")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Review your session performance before saving to history.")}
        </p>
      </div>

      {/* Workout name and Notes */}
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Workout title")}
          </label>
          <Input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-white/5 border-border text-base h-10"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Notes")}
          </label>
          <Textarea
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            placeholder={t("Write session feedback, how you felt, details...")}
            className="bg-white/5 border-border min-h-[90px] text-sm"
          />
        </div>
      </div>

      {/* Duration Editor */}
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("Duration Editor")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Hours")}</label>
            <Input
              type="number"
              value={summaryHours}
              onChange={(e) => setSummaryHours(e.target.value)}
              className="bg-white/5 border-border text-center text-lg h-10"
              min="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Minutes")}</label>
            <Input
              type="number"
              value={summaryMinutes}
              onChange={(e) => setSummaryMinutes(e.target.value)}
              className="bg-white/5 border-border text-center text-lg h-10"
              min="0"
              max="59"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Seconds")}</label>
            <Input
              type="number"
              value={summarySeconds}
              onChange={(e) => setSummarySeconds(e.target.value)}
              className="bg-white/5 border-border text-center text-lg h-10"
              min="0"
              max="59"
            />
          </div>
        </div>
      </div>

      {/* Performance Summary Details */}
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("Performance Summary")}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-2xl font-bold text-brand">{totalVolume} kg</div>
            <div className="text-xs text-muted-foreground mt-1">{t("Total volume lifted")}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center items-center">
            <div className="text-2xl font-bold text-amber-400">{personalRecords.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("PRs (Personal Records)")}</div>
          </div>
        </div>

        {/* PR badges */}
        {personalRecords.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {t("New PRs Set!")}
            </h3>
            <div className="flex flex-col gap-1.5">
              {personalRecords.map((pr, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs sm:text-sm text-amber-200"
                >
                  <span className="font-medium">{pr.exerciseName}</span>
                  <span className="font-semibold text-amber-400">
                    🏆 {pr.newWeight} {pr.isDistance ? "km" : "kg"} (Beat {pr.prevWeight} {pr.isDistance ? "km" : "kg"}!)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2.5 mt-2">
        <Button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-hover text-zinc-900 h-12 text-base font-semibold active:scale-[0.98] transition-all"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin size-4 border-2 border-zinc-900 border-t-transparent rounded-full" />
              {t("Saving...")}
            </div>
          ) : (
            t("Save")
          )}
        </Button>

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full h-11 text-zinc-400 border-border hover:text-foreground"
        >
          {t("Return to workout")}
        </Button>

        <Button
          onClick={onDiscard}
          variant="ghost"
          className="w-full text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20"
        >
          {t("Discard Workout")}
        </Button>
      </div>
    </div>
  );
}
