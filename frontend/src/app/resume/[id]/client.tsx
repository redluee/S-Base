"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Download, GripVertical, Loader2, PencilLine } from "lucide-react";
import type {
  Resume,
  ResumeFull,
  ResumeEntry,
  ResumeExperience,
  ResumeEducation,
  ResumeItemInput,
  ResumeProfile,
} from "@backend/types/shared";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import { formatPeriod, snapColumnWidth, RESUME_COLUMN_MIN, RESUME_COLUMN_MAX, RESUME_COLUMN_STEP, RESUME_SCALE_MIN, RESUME_SCALE_MAX, RESUME_SCALE_STEP, snapScale } from "@/lib/resume";
import { ResumePdfPreview } from "@/components/resume-pdf-preview";
import { downloadResumePDF } from "@/components/resume-pdf";
import { FontPicker, SliderField } from "./font-picker";

type Kind = "experience" | "education";
type Source = ResumeExperience | ResumeEducation;
type Selection = { kind: Kind; refId: number; override: string | null };

const inputCls =
  "w-full min-h-[44px] sm:min-h-[36px] rounded-lg bg-zinc-950 border border-border px-3 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function toEntry(kind: Kind, src: Source, sel: Selection): ResumeEntry {
  const exp = src as ResumeExperience;
  const edu = src as ResumeEducation;
  return {
    kind,
    refId: src.id,
    title: kind === "experience" ? exp.jobTitle : edu.degree,
    organization: kind === "experience" ? exp.company : edu.institution,
    place: src.place,
    startMonth: src.startMonth,
    startYear: src.startYear,
    endMonth: src.endMonth,
    endYear: src.endYear,
    isCurrent: src.isCurrent,
    description: sel.override ?? src.description,
    hasDescriptionOverride: sel.override !== null,
    logoPath: src.logoPath,
  };
}

interface Props {
  initial: ResumeFull;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
}

export function ResumeEditorClient({ initial, experiences, educations }: Props) {
  const [settings, setSettings] = useState<Pick<Resume, "name" | "titleFont" | "textFont" | "accentColor" | "leftWidthPct" | "titleScalePct" | "textScalePct">>({
    name: initial.resume.name,
    titleFont: initial.resume.titleFont,
    textFont: initial.resume.textFont,
    accentColor: initial.resume.accentColor,
    leftWidthPct: initial.resume.leftWidthPct,
    titleScalePct: initial.resume.titleScalePct,
    textScalePct: initial.resume.textScalePct,
  });
  const [selection, setSelection] = useState<Selection[]>(
    initial.selected.map((s) => ({ kind: s.kind, refId: s.refId, override: s.descriptionOverride ?? null }))
  );
  const [profile] = useState<ResumeProfile>(initial.profile);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [openOverride, setOpenOverride] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    setSave("saving");
    const timer = setTimeout(async () => {
      try {
        await api.resume.resumes.update(initial.resume.id, settings);
        await api.resume.resumes.setItems(
          initial.resume.id,
          selection.map<ResumeItemInput>((s) => ({ kind: s.kind, refId: s.refId, descriptionOverride: s.override }))
        );
        setSave("saved");
        setSaveError("");
      } catch (err) {
        setSave("error");
        setSaveError(err instanceof Error ? err.message : t("Er ging iets mis"));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [settings, selection, initial.resume.id]);

  const changeSettings = (patch: Partial<typeof settings>) => {
    dirty.current = true;
    setSettings((s) => ({ ...s, ...patch }));
  };
  const changeSelection = (next: Selection[]) => {
    dirty.current = true;
    setSelection(next);
  };

  const full: ResumeFull = useMemo(() => {
    const build = (kind: Kind, lib: Source[]) =>
      selection
        .filter((s) => s.kind === kind)
        .flatMap((s) => {
          const src = lib.find((i) => i.id === s.refId);
          return src ? [toEntry(kind, src, s)] : [];
        });
    return {
      resume: { ...initial.resume, ...settings },
      profile,
      experiences: build("experience", experiences),
      educations: build("education", educations),
      selected: selection.map((s) => ({ kind: s.kind, refId: s.refId, descriptionOverride: s.override })),
    };
  }, [selection, settings, profile, experiences, educations, initial.resume]);

  function toggle(kind: Kind, refId: number) {
    const exists = selection.some((s) => s.kind === kind && s.refId === refId);
    changeSelection(exists ? selection.filter((s) => !(s.kind === kind && s.refId === refId)) : [...selection, { kind, refId, override: null }]);
  }

  function move(kind: Kind, refId: number, dir: -1 | 1) {
    const same = selection.filter((s) => s.kind === kind);
    const idx = same.findIndex((s) => s.refId === refId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= same.length) return;
    const reordered = [...same];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const others = selection.filter((s) => s.kind !== kind);
    changeSelection(kind === "experience" ? [...reordered, ...others] : [...others, ...reordered]);
  }

  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [dragKey, setDragKey] = useState<string | null>(null);

  function startDrag(e: ReactPointerEvent<HTMLElement>, kind: Kind, refId: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragKey(`${kind}${refId}`);
  }

  function dragOver(e: ReactPointerEvent<HTMLElement>, kind: Kind, refId: number) {
    if (dragKey !== `${kind}${refId}`) return;
    const same = selection.filter((s) => s.kind === kind);
    const from = same.findIndex((s) => s.refId === refId);
    const to = same.findIndex((s) => {
      const rect = rowRefs.current.get(`${kind}${s.refId}`)?.getBoundingClientRect();
      return !!rect && e.clientY >= rect.top && e.clientY <= rect.bottom;
    });
    if (from < 0 || to < 0 || from === to) return;
    const reordered = [...same];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const others = selection.filter((s) => s.kind !== kind);
    changeSelection(kind === "experience" ? [...reordered, ...others] : [...others, ...reordered]);
  }

  function setOverride(kind: Kind, refId: number, override: string | null) {
    changeSelection(selection.map((s) => (s.kind === kind && s.refId === refId ? { ...s, override } : s)));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadResumePDF(full);
    } catch (err) {
      setSave("error");
      setSaveError(err instanceof Error ? err.message : t("Exporteren mislukt"));
    } finally {
      setExporting(false);
    }
  }

  const renderGroup = (kind: Kind, title: string, lib: Source[]) => {
    const selected = selection.filter((s) => s.kind === kind);
    const selectedItems = selected.flatMap((s) => {
      const src = lib.find((i) => i.id === s.refId);
      return src ? [{ src, sel: s }] : [];
    });
    const unselected = lib.filter((i) => !selected.some((s) => s.refId === i.id));
    const row = (src: Source, sel: Selection | null, index: number) => {
      const entry = toEntry(kind, src, sel ?? { kind, refId: src.id, override: null });
      const key = `${kind}${src.id}`;
      return (
        <li
          key={key}
          ref={(el) => {
            if (el) rowRefs.current.set(key, el);
            else rowRefs.current.delete(key);
          }}
          className={`rounded-xl border bg-zinc-950/60 ${dragKey === key ? "border-brand" : "border-border"}`}
        >
          <div className="flex items-center gap-1 pr-1">
            <label className="flex-1 min-w-0 flex items-start gap-3 p-3 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={!!sel}
                onChange={() => toggle(kind, src.id)}
                className="size-4 mt-0.5 accent-[#00e3a4] shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm text-zinc-100 truncate">
                  <span className="font-semibold">{entry.title}</span>
                  <span className="text-zinc-400"> — {entry.organization}</span>
                </span>
                <span className="block text-xs text-zinc-500">{formatPeriod(entry)}</span>
              </span>
            </label>
            {sel && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenOverride(openOverride === key ? null : key)}
                  aria-label={t("Omschrijving aanpassen voor dit CV")}
                  title={t("Omschrijving aanpassen voor dit CV")}
                  className={`size-11 sm:size-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 cursor-pointer ${sel.override !== null ? "text-fuchsia-300" : "text-zinc-400"}`}
                >
                  <PencilLine className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(kind, src.id, -1)}
                  aria-label={t("Omhoog")}
                  className="lg:hidden size-11 sm:size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === selectedItems.length - 1}
                  onClick={() => move(kind, src.id, 1)}
                  aria-label={t("Omlaag")}
                  className="lg:hidden size-11 sm:size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="size-4" />
                </button>
                <div
                  role="separator"
                  aria-label={t("Sleep om te verplaatsen")}
                  title={t("Sleep om te verplaatsen")}
                  onPointerDown={(e) => startDrag(e, kind, src.id)}
                  onPointerMove={(e) => dragOver(e, kind, src.id)}
                  onPointerUp={() => setDragKey(null)}
                  onPointerCancel={() => setDragKey(null)}
                  className="hidden lg:flex h-8 w-6 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 cursor-grab active:cursor-grabbing touch-none"
                >
                  <GripVertical className="size-4" />
                </div>
              </>
            )}
          </div>
          {sel && openOverride === key && (
            <div className="px-3 pb-3 space-y-2">
              <textarea
                style={{ height: 100 }}
                className={`${inputCls} py-2 resize-y text-xs`}
                value={sel.override ?? src.description}
                onChange={(e) => setOverride(kind, src.id, e.target.value)}
                aria-label={t("Omschrijving voor dit CV")}
              />
              <span className={`block text-xs ${(sel.override ?? src.description).length > 250 ? "text-amber-400" : "text-zinc-500"}`}>
                {(sel.override ?? src.description).length} / 250 {t("tekens aanbevolen")}
              </span>
              {sel.override !== null && (
                <button
                  type="button"
                  onClick={() => setOverride(kind, src.id, null)}
                  className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  {t("Terug naar originele omschrijving")}
                </button>
              )}
            </div>
          )}
        </li>
      );
    };

    return (
      <section className="bg-zinc-900 border border-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {lib.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {t("Nog niets in je bibliotheek.")}{" "}
            <Link href={kind === "experience" ? "/resume/experience" : "/resume/education"} className="text-fuchsia-300 hover:underline">
              {t("Toevoegen")}
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map(({ src, sel }, i) => row(src, sel, i))}
            {unselected.map((src) => row(src, null, 0))}
          </ul>
        )}
      </section>
    );
  };

  const editor = (
    <div className="space-y-4">
      <section className="bg-zinc-900 border border-border rounded-2xl p-4 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-100">{t("Opmaak")}</h2>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block min-w-0">
            <span className="block text-xs text-zinc-400 mb-1">{t("Naam van dit CV")}</span>
            <input className={inputCls} value={settings.name} maxLength={100} onChange={(e) => changeSettings({ name: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">{t("Accentkleur")}</span>
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => changeSettings({ accentColor: e.target.value })}
              className="h-11 sm:h-9 w-14 rounded-lg bg-zinc-950 border border-border p-1 cursor-pointer"
            />
          </label>
        </div>
        <fieldset className="space-y-2 border-t border-border pt-4">
          <legend className="sr-only">{t("Titels")}</legend>
          <FontPicker label={t("Lettertype titels")} value={settings.titleFont} onChange={(v) => changeSettings({ titleFont: v })} />
          <SliderField
            label={t("Grootte titels")}
            display={`${settings.titleScalePct}%`}
            min={RESUME_SCALE_MIN}
            max={RESUME_SCALE_MAX}
            step={RESUME_SCALE_STEP}
            value={settings.titleScalePct}
            onChange={(v) => changeSettings({ titleScalePct: snapScale(v) })}
          />
        </fieldset>
        <fieldset className="space-y-2 border-t border-border pt-4">
          <legend className="sr-only">{t("Tekst")}</legend>
          <FontPicker label={t("Lettertype tekst")} value={settings.textFont} onChange={(v) => changeSettings({ textFont: v })} />
          <SliderField
            label={t("Grootte tekst")}
            display={`${settings.textScalePct}%`}
            min={RESUME_SCALE_MIN}
            max={RESUME_SCALE_MAX}
            step={RESUME_SCALE_STEP}
            value={settings.textScalePct}
            onChange={(v) => changeSettings({ textScalePct: snapScale(v) })}
          />
        </fieldset>
        <div className="border-t border-border pt-4">
          <SliderField
            label={t("Kolombreedte")}
            display={`${settings.leftWidthPct} / ${100 - settings.leftWidthPct}`}
            min={RESUME_COLUMN_MIN}
            max={RESUME_COLUMN_MAX}
            step={RESUME_COLUMN_STEP}
            value={settings.leftWidthPct}
            onChange={(v) => changeSettings({ leftWidthPct: snapColumnWidth(v) })}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {t("Foto, persoonsgegevens, vaardigheden, talen en hobby's beheer je op de")}{" "}
          <Link href="/resume/profile" className="text-fuchsia-300 hover:underline">{t("profielpagina")}</Link>.
        </p>
      </section>
      {renderGroup("experience", t("Ervaring"), experiences)}
      {renderGroup("education", t("Opleiding"), educations)}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          href="/resume"
          aria-label={t("Terug")}
          className="size-11 sm:size-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl text-zinc-100 truncate flex-1 min-w-0">{settings.name}</h1>
        <span role="status" className="text-xs text-zinc-400">
          {save === "saving" && t("Opslaan...")}
          {save === "saved" && t("Opgeslagen")}
          {save === "error" && <span className="text-red-400">{saveError}</span>}
        </span>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="min-h-[44px] px-4 rounded-xl bg-brand text-zinc-950 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {t("Exporteer PDF")}
        </button>
      </div>

      <div className="lg:hidden flex gap-2 mb-4" role="tablist">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold border cursor-pointer ${
              tab === k ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300" : "border-border text-zinc-400"
            }`}
          >
            {k === "edit" ? t("Bewerken") : t("Voorbeeld")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 items-start">
        <div className={tab === "edit" ? "block" : "hidden lg:block"}>{editor}</div>
        <div className={`${tab === "preview" ? "block" : "hidden lg:block"} lg:sticky lg:top-24`}>
          <ResumePdfPreview data={full} />
        </div>
      </div>
    </div>
  );
}
