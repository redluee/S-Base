"use client";

import { useState } from "react";
import { t } from "@/lib/lang";
import { Cpu, Terminal, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface RamPreset {
  id: string;
  label: string;
  xms: string;
  xmx: string;
  tag?: string;
}

export const STANDARD_RAM_PRESETS: RamPreset[] = [
  { id: "1G", label: "1 GB", xms: "1G", xmx: "1G", tag: "Minimaal" },
  { id: "2G", label: "2 GB", xms: "2G", xmx: "2G", tag: "Standaard" },
  { id: "3G", label: "3 GB", xms: "3G", xmx: "3G" },
  { id: "4G", label: "4 GB", xms: "4G", xmx: "4G", tag: "Aanbevolen" },
  { id: "6G", label: "6 GB", xms: "6G", xmx: "6G", tag: "Mods" },
  { id: "8G", label: "8 GB", xms: "8G", xmx: "8G", tag: "Zwaar" },
  { id: "10G", label: "10 GB", xms: "10G", xmx: "10G" },
  { id: "12G", label: "12 GB", xms: "12G", xmx: "12G" },
  { id: "16G", label: "16 GB", xms: "16G", xmx: "16G" },
];

export const AIKAR_FLAGS_STRING =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true";

export const ZGC_FLAGS_STRING = "-XX:+UseZGC -XX:+ZGenerational -XX:+AlwaysPreTouch";

export type GcProfileId = "aikar" | "zgc" | "standard" | "custom";

export interface GcProfile {
  id: GcProfileId;
  label: string;
  badge?: string;
  badgeType?: "brand" | "info" | "neutral";
  description: string;
  flags: string;
}

export const GC_PROFILES: GcProfile[] = [
  {
    id: "aikar",
    label: "Aikar's Flags (G1GC)",
    badge: "Aanbevolen",
    badgeType: "brand",
    description: "Geoptimaliseerd voor Minecraft tick-consistentie en minimale GC-pauzes.",
    flags: AIKAR_FLAGS_STRING,
  },
  {
    id: "zgc",
    label: "Generational ZGC",
    badge: "Java 21+",
    badgeType: "info",
    description: "Ultra-lage latentie (<1ms GC-pauzes) voor consistente tick-tijden op Java 21+.",
    flags: ZGC_FLAGS_STRING,
  },
  {
    id: "standard",
    label: "Standaard JVM",
    badgeType: "neutral",
    description: "Standaard JVM garbage collection zonder specifieke Minecraft-optimalisaties.",
    flags: "",
  },
  {
    id: "custom",
    label: "Aangepast",
    badgeType: "neutral",
    description: "Volledige handmatige controle over alle JVM- en GC-parameters.",
    flags: "",
  },
];

interface ParsedArgs {
  presetId: string;
  gcProfileId: GcProfileId;
  extraFlags: string;
  customFull: string;
}

function parseExistingArgs(rawArgs?: string | null): ParsedArgs {
  if (!rawArgs || !rawArgs.trim()) {
    return {
      presetId: "4G",
      gcProfileId: "aikar",
      extraFlags: "",
      customFull: "",
    };
  }

  const trimmed = rawArgs.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  let detectedXmx = "";
  const nonMemTokens: string[] = [];

  for (const token of tokens) {
    const xmxMatch = token.match(/^-Xmx(\d+[GMK])/i);
    if (xmxMatch) {
      detectedXmx = xmxMatch[1].toUpperCase();
    } else if (!token.match(/^-Xms/i)) {
      nonMemTokens.push(token);
    }
  }

  const isZgc = tokens.some((t) => /^-XX:\+UseZGC/i.test(t));
  const isAikar =
    tokens.some((t) => /-Dusing\.aikars\.flags/i.test(t)) ||
    tokens.some((t) => /^-XX:G1NewSizePercent/i.test(t)) ||
    (tokens.some((t) => /^-XX:\+UseG1GC/i.test(t)) && tokens.some((t) => /^-XX:\+ParallelRefProcEnabled/i.test(t)));

  let detectedProfile: GcProfileId = "standard";
  let cleanExtraTokens: string[] = [];

  if (isZgc) {
    detectedProfile = "zgc";
    const zgcSet = new Set(ZGC_FLAGS_STRING.split(/\s+/));
    cleanExtraTokens = nonMemTokens.filter((tok) => !zgcSet.has(tok));
  } else if (isAikar) {
    detectedProfile = "aikar";
    const aikarSet = new Set(AIKAR_FLAGS_STRING.split(/\s+/));
    cleanExtraTokens = nonMemTokens.filter((tok) => !aikarSet.has(tok));
  } else if (nonMemTokens.some((t) => /^-XX:/i.test(t))) {
    detectedProfile = "custom";
  } else {
    detectedProfile = "standard";
    cleanExtraTokens = [...nonMemTokens];
  }

  if (detectedProfile === "custom") {
    return {
      presetId: "custom",
      gcProfileId: "custom",
      extraFlags: "",
      customFull: trimmed,
    };
  }

  if (detectedXmx) {
    const matchedPreset = STANDARD_RAM_PRESETS.find((p) => p.id.toUpperCase() === detectedXmx);
    if (matchedPreset) {
      return {
        presetId: matchedPreset.id,
        gcProfileId: detectedProfile,
        extraFlags: cleanExtraTokens.join(" "),
        customFull: trimmed,
      };
    }
  }

  return {
    presetId: "custom",
    gcProfileId: "custom",
    extraFlags: "",
    customFull: trimmed,
  };
}

interface JavaMemorySelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  engine?: string;
}

export function JavaMemorySelector({
  value,
  onChange,
  disabled = false,
  engine = "vanilla",
}: JavaMemorySelectorProps) {
  const [lastValue, setLastValue] = useState(value);
  const [state, setState] = useState<ParsedArgs>(() => parseExistingArgs(value));

  if (value !== lastValue) {
    setLastValue(value);
    setState(parseExistingArgs(value));
  }

  const { presetId: selectedPreset, gcProfileId: selectedGc, extraFlags, customFull: customArgs } = state;

  const buildCombinedArgs = (presetId: string, gcId: GcProfileId, extra: string, custom: string): string => {
    if (presetId === "custom" || gcId === "custom") {
      return custom.trim();
    }
    const preset = STANDARD_RAM_PRESETS.find((p) => p.id === presetId) || STANDARD_RAM_PRESETS[3]; // default 4G
    const memFlags = `-Xms${preset.xms} -Xmx${preset.xmx}`;
    const gcProfile = GC_PROFILES.find((p) => p.id === gcId);
    const gcFlags = gcProfile?.flags || "";
    const extraTrimmed = extra.trim();

    return [memFlags, gcFlags, extraTrimmed].filter(Boolean).join(" ");
  };

  const updateCombinedValue = (presetId: string, gcId: GcProfileId, flags: string, customText: string) => {
    setState({ presetId, gcProfileId: gcId, extraFlags: flags, customFull: customText });
    const combined = buildCombinedArgs(presetId, gcId, flags, customText);
    onChange(combined);
  };

  const handleSelectPreset = (presetId: string) => {
    if (disabled) return;
    if (presetId === "custom") {
      const initialCustom = customArgs.trim()
        ? customArgs
        : buildCombinedArgs(selectedPreset, selectedGc, extraFlags, "");
      updateCombinedValue("custom", "custom", extraFlags, initialCustom);
    } else {
      const newGc = selectedGc === "custom" ? "aikar" : selectedGc;
      updateCombinedValue(presetId, newGc, extraFlags, customArgs);
    }
  };

  const handleSelectGcProfile = (gcId: GcProfileId) => {
    if (disabled) return;
    if (gcId === "custom") {
      const initialCustom = customArgs.trim()
        ? customArgs
        : buildCombinedArgs(selectedPreset, selectedGc, extraFlags, "");
      updateCombinedValue("custom", "custom", extraFlags, initialCustom);
    } else {
      const newPreset = selectedPreset === "custom" ? "4G" : selectedPreset;
      updateCombinedValue(newPreset, gcId, extraFlags, customArgs);
    }
  };

  const handleExtraFlagsChange = (newFlags: string) => {
    updateCombinedValue(selectedPreset, selectedGc, newFlags, customArgs);
  };

  const handleCustomArgsChange = (newCustom: string) => {
    updateCombinedValue("custom", "custom", extraFlags, newCustom);
  };

  const currentPreset = STANDARD_RAM_PRESETS.find((p) => p.id === selectedPreset);
  const currentGc = GC_PROFILES.find((p) => p.id === selectedGc);

  const previewArgs =
    selectedPreset === "custom" || selectedGc === "custom"
      ? customArgs.trim() || "-Xms2G -Xmx2G"
      : buildCombinedArgs(selectedPreset, selectedGc, extraFlags, "");

  const jarName = engine === "fabric" ? "fabric-server-launch.jar" : "server.jar";

  return (
    <div className="space-y-6">
      {/* 1. RAM Allocation */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-200 flex items-center gap-2">
              <Cpu className="size-4 text-brand" />
              {t("RAM Allocation")}
            </Label>
            <span className="text-[11px] text-zinc-400 font-mono">
              {selectedPreset === "custom"
                ? t("Custom")
                : `${currentPreset?.xmx ?? "4G"} RAM (-Xms${currentPreset?.xms ?? "4G"} -Xmx${currentPreset?.xmx ?? "4G"})`}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {t("Select standard memory allocation or customize Java arguments for optimal server performance.")}
          </p>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STANDARD_RAM_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 disabled:opacity-50 ${
                  isSelected
                    ? "bg-brand/15 border-brand text-zinc-100 shadow-[0_0_1rem_-0.25rem_rgba(0,227,164,0.3)]"
                    : "bg-black/30 border-white/10 hover:border-white/20 text-zinc-300 hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-display font-bold text-sm">{preset.label}</span>
                  {preset.tag && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        isSelected
                          ? "bg-brand text-zinc-950"
                          : preset.tag === "Aanbevolen"
                          ? "bg-brand/20 text-brand border border-brand/30"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {t(preset.tag)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  -Xmx{preset.xmx}
                </span>
              </button>
            );
          })}

          {/* Custom RAM Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectPreset("custom")}
            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 disabled:opacity-50 ${
              selectedPreset === "custom"
                ? "bg-brand/15 border-brand text-zinc-100 shadow-[0_0_1rem_-0.25rem_rgba(0,227,164,0.3)]"
                : "bg-black/30 border-white/10 hover:border-white/20 text-zinc-300 hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-display font-bold text-sm">{t("Custom")}</span>
              <Sparkles className="size-3 text-brand" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {t("Custom Java Args")}
            </span>
          </button>
        </div>
      </div>

      {/* 2. GC Profile Selection */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-200 flex items-center gap-2">
              <Zap className="size-4 text-brand" />
              {t("Garbage Collector & Performance")}
            </Label>
            <span className="text-[11px] text-zinc-400 font-mono">
              {currentGc?.label ?? t("Custom")}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {t("Optimized GC flags prevent tick stutter and maintain consistent 20 TPS.")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {GC_PROFILES.map((profile) => {
            const isSelected = selectedGc === profile.id && selectedPreset !== "custom";
            return (
              <button
                key={profile.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectGcProfile(profile.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 disabled:opacity-50 ${
                  isSelected
                    ? "bg-brand/15 border-brand text-zinc-100 shadow-[0_0_1rem_-0.25rem_rgba(0,227,164,0.25)]"
                    : "bg-black/30 border-white/10 hover:border-white/20 text-zinc-300 hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
                    {profile.id === "aikar" && <ShieldCheck className="size-3.5 text-brand" />}
                    {t(profile.label)}
                  </span>
                  {profile.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        isSelected
                          ? "bg-brand text-zinc-950"
                          : profile.badgeType === "brand"
                          ? "bg-brand/20 text-brand border border-brand/30"
                          : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      }`}
                    >
                      {t(profile.badge)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {t(profile.description)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Inputs depending on custom or preset selection */}
      {selectedPreset === "custom" || selectedGc === "custom" ? (
        <div className="space-y-2">
          <Label className="text-xs text-zinc-300">{t("Custom Java Arguments")}</Label>
          <Input
            value={customArgs}
            onChange={(e) => handleCustomArgsChange(e.target.value)}
            disabled={disabled}
            placeholder="-Xms4G -Xmx4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled"
            className="font-mono text-xs bg-black/40 border-white/10 disabled:opacity-50"
          />
          <p className="text-[11px] text-zinc-500">
            {t("Include -Xms and -Xmx memory flags and any custom JVM parameters.")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs text-zinc-300">
            {t("Additional Java Arguments")} <span className="text-zinc-500 font-normal">({t("Optional")})</span>
          </Label>
          <Input
            value={extraFlags}
            onChange={(e) => handleExtraFlagsChange(e.target.value)}
            disabled={disabled}
            placeholder="-Duser.timezone=Europe/Amsterdam"
            className="font-mono text-xs bg-black/40 border-white/10 disabled:opacity-50"
          />
          <p className="text-[11px] text-zinc-500">
            {t("RAM and GC optimizations are configured automatically. Add extra JVM flags here.")}
          </p>
        </div>
      )}

      {/* 4. Live Launch Preview */}
      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Terminal className="size-3 text-brand" />
            <span>{t("Launch Command Preview")}</span>
          </div>
          {selectedGc === "aikar" && (
            <span className="text-[10px] text-brand/80 font-mono flex items-center gap-1">
              <ShieldCheck className="size-3" /> Aikar Flags Active
            </span>
          )}
          {selectedGc === "zgc" && (
            <span className="text-[10px] text-sky-400/80 font-mono flex items-center gap-1">
              <Zap className="size-3" /> GenZGC Active
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-zinc-300 bg-black/60 p-2.5 rounded-lg border border-white/5 break-all leading-relaxed max-h-28 overflow-y-auto">
          <span className="text-emerald-400 font-bold">java</span>{" "}
          <span className="text-brand/90">{previewArgs}</span>{" "}
          <span className="text-sky-400 font-medium">-jar {jarName} nogui</span>
        </div>
      </div>
    </div>
  );
}
