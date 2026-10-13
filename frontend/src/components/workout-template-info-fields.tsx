"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/lang";

interface TemplateInfoFieldsProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  targetMuscleGroups: string;
  setTargetMuscleGroups: (v: string) => void;
  estimatedTime: string;
  setEstimatedTime: (v: string) => void;
  errors: Record<string, string>;
}

export function TemplateInfoFields({
  name,
  setName,
  description,
  setDescription,
  targetMuscleGroups,
  setTargetMuscleGroups,
  estimatedTime,
  setEstimatedTime,
  errors,
}: TemplateInfoFieldsProps) {
  return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm font-medium">{t("Template Name")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g., Push Day (Hypertrophy)")}
            aria-invalid={Boolean(errors.name)}
            className={`bg-white/5 border-border h-11 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            required
            autoFocus
          />
          {errors.name && <p role="alert" className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-sm font-medium">{t("Description")} <span className="text-muted-foreground font-normal">({t("Optional")})</span></Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Focus on slow eccentrics...")}
            rows={2}
            className="bg-white/5 border-border resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="targetMuscleGroups" className="text-sm font-medium">{t("Target Muscles")}</Label>
            <Input
              id="targetMuscleGroups"
              value={targetMuscleGroups}
              onChange={(e) => setTargetMuscleGroups(e.target.value)}
              placeholder={t("Chest, Triceps, Shoulders")}
              className="bg-white/5 border-border h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estimatedTime" className="text-sm font-medium">{t("Est. Duration (min)")}</Label>
            <Input
              id="estimatedTime"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value.replace(/\D/g, ""))}
              placeholder="60"
              className="bg-white/5 border-border h-11"
            />
          </div>
        </div>
      </div>
  );
}
