"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, CloudOff } from "lucide-react";
import { t } from "@/lib/lang";
import { InlineAlert } from "@/components/ui/inline-alert";
import { formatNumberNl, sanitizeIntegerInput } from "@/lib/number-input";
import { formatPersonalRecord } from "@/lib/personal-records";

import type { PersonalRecord } from "@backend/types/shared";

interface WorkoutCompletionSummaryProps {
  error?: string | null;
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
  savedLocally?: boolean;
  onLeave?: () => void;
}

export function WorkoutCompletionSummary({
  error,
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
  savedLocally = false,
  onLeave,
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
          <label htmlFor="summary-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Workout title")}
          </label>
          <Input
            id="summary-title"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-white/5 border-border text-base h-11"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="summary-notes" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Notes")}
          </label>
          <Textarea
            id="summary-notes"
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
          {[
            { id: "summary-hours", label: t("Hours"), value: summaryHours, set: setSummaryHours },
            { id: "summary-minutes", label: t("Minutes"), value: summaryMinutes, set: setSummaryMinutes },
            { id: "summary-seconds", label: t("Seconds"), value: summarySeconds, set: setSummarySeconds },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="text-[11px] text-muted-foreground mb-1 block uppercase">{field.label}</label>
              <Input
                id={field.id}
                type="text"
                inputMode="numeric"
                value={field.value}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => field.set(sanitizeIntegerInput(e.target.value, 3))}
                className="bg-white/5 border-border text-center text-lg h-11 tabular-nums"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary Details */}
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("Performance Summary")}
        </h2>

        <div className="grid grid-cols-2 divide-x divide-border/40">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-brand tabular-nums">{formatNumberNl(Math.max(0, totalVolume))} kg</div>
            <div className="text-xs text-muted-foreground mt-1">{t("Total volume lifted")}</div>
          </div>
          <div className="p-4 text-center flex flex-col justify-center items-center">
            <div className="text-2xl font-bold text-foreground tabular-nums">{personalRecords.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("PRs (Personal Records)")}</div>
          </div>
        </div>

        {/* PR badges */}
        {personalRecords.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-xs font-medium text-brand flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("New PRs Set!")}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {personalRecords.map((pr, idx) => {
                const { label, value } = formatPersonalRecord(pr);
                return (
                  <li
                    key={idx}
                    className="flex flex-wrap justify-between items-center gap-x-3 gap-y-0.5 px-3 py-2 rounded-lg bg-white/5 ring-1 ring-foreground/10 text-xs sm:text-sm text-foreground"
                  >
                    <span className="font-medium text-left min-w-0 break-words">{label}</span>
                    <span className="font-semibold text-brand text-right tabular-nums inline-flex items-center gap-1.5">
                      <Trophy className="size-3.5 shrink-0" aria-hidden="true" />
                      {value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            {t("No new personal records this time. Consistency builds strength.")}
          </p>
        )}
      </div>

      <InlineAlert>{error}</InlineAlert>

      {savedLocally && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg bg-white/5 ring-1 ring-foreground/10 px-3 py-2.5 text-sm text-foreground"
        >
          <CloudOff className="size-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-words">
            {t("Workout saved on this device. The server could not be reached; it will sync automatically once you are back online.")}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2.5 mt-2">
        <Button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-hover text-zinc-900 h-12 text-base font-semibold"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin size-4 border-2 border-zinc-900 border-t-transparent rounded-full" />
              {t("Saving...")}
            </div>
          ) : savedLocally ? (
            t("Retry sync")
          ) : (
            t("Save")
          )}
        </Button>

        {savedLocally ? (
          onLeave && (
            <Button
              onClick={onLeave}
              disabled={saving}
              variant="outline"
              className="w-full min-h-11 text-muted-foreground border-border hover:text-foreground"
            >
              {t("Terug naar workouts")}
            </Button>
          )
        ) : (
          <>
            <Button
              onClick={onCancel}
              disabled={saving}
              variant="outline"
              className="w-full min-h-11 text-muted-foreground border-border hover:text-foreground"
            >
              {t("Return to workout")}
            </Button>

            <Button
              onClick={onDiscard}
              disabled={saving}
              variant="ghost"
              className="w-full min-h-11 text-sm text-destructive hover:bg-destructive/10"
            >
              {t("Discard Workout")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
