"use client";

import React from "react";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import { ExerciseCategorySelector } from "@/components/exercise-category-selector";
import { TimeInput } from "@/components/ui/time-input";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrackingFields {
  reps: boolean;
  time: boolean;
  weight: boolean;
  distance: boolean;
}

export interface ExerciseRowData {
  id?: string;
  name: string;
  category: string;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  distanceUnit: string;
  duration: string;
  heartRate?: string;
  defaultRestTime: string;
  equipment: string;
  perSide: boolean;
  trackingFields: TrackingFields;
}

export function mapCategory(cat: string) {
  if (cat === "resistance") return "Free Weights";
  if (cat === "bodyweight") return "Bodyweight";
  if (cat === "cardio") return "Cardio";
  if (cat === "isometric") return "Functional";
  return cat || "Free Weights";
}

export function unmapCategory(cat: string): string {
  if (cat === "Free Weights" || cat === "Machines") return "resistance";
  if (cat === "Bodyweight") return "bodyweight";
  if (cat === "Cardio") return "cardio";
  if (cat === "Functional") return "isometric";
  return "resistance";
}

export function mapEquipment(eq: string) {
  if (!eq || eq === "none") return "";
  if (eq === "barbell") return "Barbell";
  if (eq === "dumbbell") return "Dumbbell";
  if (eq === "kettlebell") return "Kettlebell";
  if (eq === "cable") return "Cable";
  if (eq === "machine") return "Machine";
  if (eq === "band") return "Resistance Band";
  if (eq === "ball") return "Medicine Ball";
  return eq;
}

export function getDefaultTracking(category: string): TrackingFields {
  if (category === "Cardio") return { reps: false, time: true, weight: false, distance: true };
  if (category === "Functional") return { reps: true, time: true, weight: true, distance: false };
  return { reps: true, time: false, weight: true, distance: false };
}

export function formatDuration(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export interface ExerciseEditBlockProps {
  exercise: ExerciseRowData;
  index?: number;
  errors?: Record<string, string>;
  onChange: (fields: Partial<ExerciseRowData>) => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saveButtonLabel?: string;
}

export function ExerciseEditBlock({
  exercise,
  index,
  errors = {},
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  onSave,
  onCancel,
  saveButtonLabel,
}: ExerciseEditBlockProps) {
  const ex = exercise;
  const exId = ex.id ?? "ex-block";

  function handleSelectAutocomplete(
    name: string,
    sets?: number,
    reps?: number,
    category?: string,
    equipment?: string,
    defaultRestTime?: number
  ) {
    const updates: Partial<ExerciseRowData> = { name };
    if (category) {
      const mappedCat = mapCategory(category);
      updates.category = mappedCat;
      updates.trackingFields = getDefaultTracking(mappedCat);
    }
    if (equipment) updates.equipment = mapEquipment(equipment);
    if (sets !== undefined) updates.sets = sets.toString();
    if (reps !== undefined) updates.reps = reps.toString();
    if (defaultRestTime !== undefined) updates.defaultRestTime = formatDuration(defaultRestTime);

    onChange(updates);
  }

  return (
    <div className="relative flex flex-col gap-5 p-5 bg-card/40 border border-border/50 rounded-xl group shadow-sm">
      <div className="absolute top-0 left-0 w-1 h-full bg-brand/40 rounded-l-xl" />

      {/* Header with Exercise Autocomplete */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {index !== undefined && (
            <span className="flex items-center justify-center size-6 rounded-full bg-brand/20 border border-brand/30 text-xs font-bold text-brand shrink-0 shadow-xs">
              {index + 1}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <ExerciseAutocomplete
              value={ex.name}
              onChange={(val) => onChange({ name: val })}
              onSelect={handleSelectAutocomplete}
              placeholder={t("Exercise Name")}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onMoveUp && onMoveDown && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={onMoveUp}
                className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={t("Move Up")}
              >
                <ChevronUp className="size-5" />
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={onMoveDown}
                className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                title={t("Move Down")}
              >
                <ChevronDown className="size-5" />
              </button>
            </div>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
              title={t("Remove")}
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* Category & Equipment Selector (Premium Chip UI) */}
      <div className="bg-background/50 rounded-xl p-3 border border-border/40">
        <ExerciseCategorySelector
          category={ex.category}
          equipment={ex.equipment}
          onChange={(cat, eq) => {
            const updates: Partial<ExerciseRowData> = { category: cat, equipment: eq };
            if (cat !== ex.category) {
              updates.trackingFields = getDefaultTracking(cat);
            }
            onChange(updates);
          }}
        />
      </div>

      {/* Dynamic Tracking Toggles */}
      <div className="flex flex-col gap-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {t("Track Targets")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {(["reps", "time", "weight", "distance"] as const).map((field) => {
            const isActive = ex.trackingFields[field];
            return (
              <button
                key={field}
                type="button"
                onClick={() => {
                  const nextFields = { ...ex.trackingFields };
                  if (field === "weight") {
                    nextFields.weight = !isActive;
                  } else {
                    nextFields.reps = false;
                    nextFields.time = false;
                    nextFields.distance = false;
                    nextFields[field] = !isActive;
                  }
                  onChange({ trackingFields: nextFields });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  isActive
                    ? "bg-brand/15 border-brand/50 text-brand shadow-sm"
                    : "bg-white/5 border-border/80 text-muted-foreground hover:bg-white/10"
                )}
              >
                {t(field.charAt(0).toUpperCase() + field.slice(1))}
                {isActive && <span className="ml-1 opacity-70 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields Flex Container */}
      <div className="flex flex-wrap items-end gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
        {/* Sets & Reps / Sets & Time / Sets */}
        {ex.trackingFields.reps ? (
          <div className="grid gap-1.5 flex-1 min-w-[120px] max-w-[160px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("Sets × Reps")}
            </Label>
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={ex.sets}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 2) onChange({ sets: val });
                }}
                placeholder="3"
                className={`bg-white/5 h-10 border-border text-sm font-medium text-center px-1 flex-1 min-w-0 ${
                  errors[`${exId}-sets`] ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
                }`}
              />
              <span className="text-muted-foreground text-xs font-bold shrink-0 select-none">✕</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={ex.reps}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 3) onChange({ reps: val });
                }}
                placeholder="10"
                className={`bg-white/5 h-10 border-border text-sm font-medium text-center px-1 flex-1 min-w-0 ${
                  errors[`${exId}-reps`] ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
                }`}
              />
            </div>
          </div>
        ) : ex.trackingFields.time ? (
          <div className="grid gap-1.5 flex-[1.5] min-w-[180px] max-w-[260px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("Sets × Time")}
            </Label>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <div className="w-16 shrink-0">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={ex.sets}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 2) onChange({ sets: val });
                  }}
                  placeholder="3"
                  className={`bg-white/5 h-10 border-border text-sm font-medium text-center px-1 w-full ${
                    errors[`${exId}-sets`] ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
                  }`}
                />
              </div>
              <span className="text-muted-foreground text-xs font-bold shrink-0 select-none">✕</span>
              <div className="flex-1 min-w-0">
                <TimeInput
                  value={ex.duration}
                  onChange={(val) => onChange({ duration: val })}
                  className="bg-white/5 h-10 border-border text-sm font-medium w-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5 flex-1 min-w-[80px] max-w-[100px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("Sets")}
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={ex.sets}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 2) onChange({ sets: val });
              }}
              placeholder="3"
              className={`bg-white/5 h-10 border-border text-sm font-medium text-center ${
                errors[`${exId}-sets`] ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
              }`}
            />
          </div>
        )}

        {/* Weight */}
        {ex.trackingFields.weight && (
          <div className="grid gap-1.5 flex-1 min-w-[100px] max-w-[140px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {ex.category === "Bodyweight" ? t("Added Weight") : t("Weight")}
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={ex.weight}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.-]/g, "");
                if ((val.match(/\./g) || []).length > 1) return;
                if (val.indexOf("-") > 0) return;
                onChange({ weight: val });
              }}
              placeholder="kg"
              className="bg-white/5 h-10 border-border text-sm font-medium"
            />
          </div>
        )}

        {/* Distance */}
        {ex.trackingFields.distance && (
          <div className="grid gap-1.5 flex-1 min-w-[130px] max-w-[180px]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("Distance")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={ex.distance}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  if ((val.match(/\./g) || []).length > 1) return;
                  onChange({ distance: val });
                }}
                placeholder="0.0"
                className="bg-white/5 h-10 border-border text-sm font-medium w-full min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ distanceUnit: ex.distanceUnit === "km" ? "m" : "km" })
                }
                className="h-10 px-2 flex items-center justify-center bg-white/5 border border-border rounded-md text-xs font-semibold text-muted-foreground shrink-0"
              >
                {ex.distanceUnit}
              </button>
            </div>
          </div>
        )}

        {/* Rest Time */}
        <div className="grid gap-1.5 flex-1 min-w-[100px] max-w-[140px]">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("Rest Time")}
          </Label>
          <TimeInput
            value={ex.defaultRestTime}
            onChange={(val) => onChange({ defaultRestTime: val })}
            className="bg-white/5 h-10 border-border text-sm font-medium"
          />
        </div>

        {/* Per Side Switch */}
        <div className="grid gap-1.5 shrink-0 min-w-[80px] justify-center sm:justify-start">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground text-center sm:text-left">
            {t("Per Side")}
          </Label>
          <div className="flex items-center h-10 pt-1">
            <Switch
              checked={ex.perSide}
              onCheckedChange={(val) => onChange({ perSide: val })}
            />
          </div>
        </div>
      </div>

      {/* Optional Action Buttons (Save/Cancel) */}
      {(onSave || onCancel) && (
        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border/30">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="border-border text-muted-foreground hover:bg-white/5"
            >
              {t("Cancel")}
            </Button>
          )}
          {onSave && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              className="bg-brand text-zinc-950 font-semibold hover:bg-brand-hover shadow-md"
            >
              <Check className="size-4 mr-1.5" />
              {saveButtonLabel || t("Voeg toe aan training")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
