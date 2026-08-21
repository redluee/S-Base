"use client";

import { useState } from "react";
import { t } from "@/lib/lang";
import { Cpu, Terminal, Sparkles } from "lucide-react";
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
  { id: "1G", label: "1 GB", xms: "512M", xmx: "1G", tag: "Minimaal" },
  { id: "2G", label: "2 GB", xms: "1G", xmx: "2G", tag: "Standaard" },
  { id: "3G", label: "3 GB", xms: "1G", xmx: "3G" },
  { id: "4G", label: "4 GB", xms: "2G", xmx: "4G", tag: "Aanbevolen" },
  { id: "6G", label: "6 GB", xms: "2G", xmx: "6G", tag: "Mods" },
  { id: "8G", label: "8 GB", xms: "4G", xmx: "8G", tag: "Zwaar" },
  { id: "10G", label: "10 GB", xms: "4G", xmx: "10G" },
  { id: "12G", label: "12 GB", xms: "4G", xmx: "12G" },
  { id: "16G", label: "16 GB", xms: "4G", xmx: "16G" },
];

function parseExistingArgs(rawArgs?: string | null): { presetId: string; extraFlags: string; customFull: string } {
  if (!rawArgs || !rawArgs.trim()) {
    return { presetId: "2G", extraFlags: "", customFull: "" };
  }

  const trimmed = rawArgs.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  let detectedXmx = "";
  const remainingTokens: string[] = [];

  for (const token of tokens) {
    const xmxMatch = token.match(/^-Xmx(\d+[GMK])/i);
    if (xmxMatch) {
      detectedXmx = xmxMatch[1].toUpperCase();
    } else if (!token.match(/^-Xms/i)) {
      remainingTokens.push(token);
    }
  }

  if (detectedXmx) {
    const matchedPreset = STANDARD_RAM_PRESETS.find((p) => p.id.toUpperCase() === detectedXmx);
    if (matchedPreset) {
      return {
        presetId: matchedPreset.id,
        extraFlags: remainingTokens.join(" "),
        customFull: trimmed,
      };
    }
  }

  return {
    presetId: "custom",
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
  const [state, setState] = useState(() => parseExistingArgs(value));

  if (value !== lastValue) {
    setLastValue(value);
    setState(parseExistingArgs(value));
  }

  const { presetId: selectedPreset, extraFlags, customFull: customArgs } = state;

  const updateCombinedValue = (presetId: string, flags: string, customText: string) => {
    setState({ presetId, extraFlags: flags, customFull: customText });
    if (presetId === "custom") {
      onChange(customText.trim());
    } else {
      const preset = STANDARD_RAM_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        const memFlags = `-Xms${preset.xms} -Xmx${preset.xmx}`;
        const combined = flags.trim() ? `${memFlags} ${flags.trim()}` : memFlags;
        onChange(combined);
      }
    }
  };

  const handleSelectPreset = (presetId: string) => {
    if (disabled) return;
    if (presetId === "custom") {
      const initialCustom = customArgs.trim()
        ? customArgs
        : (() => {
            const preset = STANDARD_RAM_PRESETS.find((p) => p.id === selectedPreset);
            return preset
              ? `-Xms${preset.xms} -Xmx${preset.xmx}${extraFlags.trim() ? " " + extraFlags.trim() : ""}`
              : "-Xms1G -Xmx2G";
          })();
      updateCombinedValue("custom", extraFlags, initialCustom);
    } else {
      updateCombinedValue(presetId, extraFlags, customArgs);
    }
  };

  const handleExtraFlagsChange = (newFlags: string) => {
    updateCombinedValue(selectedPreset, newFlags, customArgs);
  };

  const handleCustomArgsChange = (newCustom: string) => {
    updateCombinedValue("custom", extraFlags, newCustom);
  };

  const currentPreset = STANDARD_RAM_PRESETS.find((p) => p.id === selectedPreset);
  const previewArgs =
    selectedPreset === "custom"
      ? customArgs.trim() || "-Xms512M -Xmx2G"
      : currentPreset
      ? `-Xms${currentPreset.xms} -Xmx${currentPreset.xmx}${extraFlags.trim() ? " " + extraFlags.trim() : ""}`
      : "-Xms512M -Xmx2G";

  const jarName = engine === "fabric" ? "fabric-server-launch.jar" : "server.jar";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-200 flex items-center gap-2">
            <Cpu className="size-4 text-brand" />
            {t("RAM Allocation")}
          </Label>
          <span className="text-[11px] text-zinc-400 font-mono">
            {selectedPreset === "custom" ? t("Custom") : `${currentPreset?.xmx ?? "2G"} RAM (${currentPreset?.xms ?? "512M"} min)`}
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

        {/* Custom Preset Button */}
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

      {/* Inputs according to selection */}
      {selectedPreset === "custom" ? (
        <div className="space-y-2">
          <Label className="text-xs text-zinc-300">{t("Custom Java Arguments")}</Label>
          <Input
            value={customArgs}
            onChange={(e) => handleCustomArgsChange(e.target.value)}
            disabled={disabled}
            placeholder="-Xms2G -Xmx6G -XX:+UseG1GC"
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
            placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
            className="font-mono text-xs bg-black/40 border-white/10 disabled:opacity-50"
          />
          <p className="text-[11px] text-zinc-500">
            {t("RAM flags are configured automatically. Add extra JVM or GC flags here.")}
          </p>
        </div>
      )}

      {/* Live Launch Preview */}
      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
          <Terminal className="size-3 text-brand" />
          <span>{t("Launch Command Preview")}</span>
        </div>
        <div className="text-[11px] font-mono text-zinc-300 bg-black/60 p-2 rounded-lg border border-white/5 break-all leading-relaxed">
          <span className="text-emerald-400">java</span>{" "}
          <span className="text-brand">{previewArgs}</span>{" "}
          <span className="text-sky-400">-jar {jarName} nogui</span>
        </div>
      </div>
    </div>
  );
}
