"use client";

import { useState } from "react";
import { t } from "@/lib/lang";
import { CURATED_FONTS, GOOGLE_PREFIX } from "@/lib/resume";
import { resolveResumeFont } from "@/lib/resume-fonts";

const selectCls =
  "w-full min-h-[44px] sm:min-h-[36px] rounded-lg bg-zinc-950 border border-border px-3 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const isGoogle = value.startsWith(GOOGLE_PREFIX);
  const [showGoogle, setShowGoogle] = useState(isGoogle);
  const [family, setFamily] = useState(isGoogle ? value.slice(GOOGLE_PREFIX.length) : "");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function loadGoogle() {
    const name = family.trim();
    if (!name) return;
    setState("loading");
    const resolved = await resolveResumeFont(`${GOOGLE_PREFIX}${name}`);
    if (resolved) {
      setState("idle");
      onChange(`${GOOGLE_PREFIX}${name}`);
    } else {
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="block text-xs text-zinc-400 mb-1">{label}</span>
        <select
          className={selectCls}
          value={showGoogle ? "__google" : value}
          onChange={(e) => {
            if (e.target.value === "__google") {
              setShowGoogle(true);
            } else {
              setShowGoogle(false);
              onChange(e.target.value);
            }
          }}
        >
          {CURATED_FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
          <option value="__google">{t("Google Font...")}</option>
        </select>
      </label>
      {showGoogle && (
        <div className="flex gap-2">
          <input
            aria-label={t("Naam van de Google Font")}
            className={selectCls}
            placeholder={t("bijv. Open Sans")}
            value={family}
            onChange={(e) => {
              setFamily(e.target.value);
              setState("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                loadGoogle();
              }
            }}
          />
          <button
            type="button"
            onClick={loadGoogle}
            disabled={state === "loading" || !family.trim()}
            className="min-h-[44px] sm:min-h-[36px] px-3 rounded-lg border border-border text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {state === "loading" ? t("Laden...") : t("Gebruik")}
          </button>
        </div>
      )}
      {state === "error" && <p role="alert" className="text-xs text-red-400">{t("Font niet gevonden of niet beschikbaar als TTF.")}</p>}
    </div>
  );
}

export function SliderField({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  inverted = false,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  inverted?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-300">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inverted ? { direction: "rtl" } : undefined}
        className="w-full h-11 sm:h-7 accent-[#00e3a4]"
      />
    </label>
  );
}
