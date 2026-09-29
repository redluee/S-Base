"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { ResumeExperience, ResumeEducation } from "@backend/types/shared";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import { formatPeriod, MONTH_OPTIONS } from "@/lib/resume";
import { ModalOverlay } from "@/components/ui/modal-overlay";

type Kind = "experience" | "education";
type Item = ResumeExperience | ResumeEducation;

interface FormState {
  title: string;
  organization: string;
  place: string;
  startMonth: number;
  startYear: string;
  endMonth: number;
  endYear: string;
  isCurrent: boolean;
  description: string;
}

const thisYear = new Date().getFullYear();

const emptyForm: FormState = {
  title: "",
  organization: "",
  place: "",
  startMonth: 1,
  startYear: String(thisYear),
  endMonth: 12,
  endYear: String(thisYear),
  isCurrent: false,
  description: "",
};

const inputCls =
  "w-full min-h-[44px] sm:min-h-[36px] rounded-lg bg-zinc-950 border border-border px-3 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function titleOf(kind: Kind, item: Item) {
  return kind === "experience" ? (item as ResumeExperience).jobTitle : (item as ResumeEducation).degree;
}
function orgOf(kind: Kind, item: Item) {
  return kind === "experience" ? (item as ResumeExperience).company : (item as ResumeEducation).institution;
}

export function ResumeLibraryClient({ kind, initialItems }: { kind: Kind; initialItems: Item[] }) {
  const isExp = kind === "experience";
  const service = isExp ? api.resume.experiences : api.resume.educations;
  const [items, setItems] = useState<Item[]>(initialItems);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function reload() {
    setItems(await service.list());
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      title: titleOf(kind, item),
      organization: orgOf(kind, item),
      place: item.place,
      startMonth: item.startMonth,
      startYear: String(item.startYear),
      endMonth: item.endMonth ?? 12,
      endYear: String(item.endYear ?? thisYear),
      isCurrent: item.isCurrent,
      description: item.description,
    });
    setError("");
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const period = {
      startMonth: form.startMonth,
      startYear: Number(form.startYear),
      endMonth: form.isCurrent ? null : form.endMonth,
      endYear: form.isCurrent ? null : Number(form.endYear),
      isCurrent: form.isCurrent,
    };
    const common = { place: form.place, description: form.description, ...period };
    const payload = isExp
      ? { ...common, jobTitle: form.title, company: form.organization }
      : { ...common, degree: form.title, institution: form.organization };
    try {
      if (editing) await service.update(editing.id, payload as never);
      else await service.create(payload as never);
      await reload();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Er ging iets mis"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(t("Weet je zeker dat je dit item wilt verwijderen? Het verdwijnt ook uit je CV's."))) return;
    try {
      await service.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Er ging iets mis"));
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-zinc-100">{isExp ? t("Ervaring") : t("Opleidingen")}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t("Je bibliotheek. Per CV kies je welke items je toont.")}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] px-4 rounded-xl bg-brand text-zinc-950 text-sm font-semibold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          {t("Toevoegen")}
        </button>
      </div>
      {error && !open && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Nog niets toegevoegd.")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="bg-zinc-900 border border-border rounded-2xl p-3 pl-4 flex items-start gap-2">
              <div className="flex-1 min-w-0 py-1">
                <div className="text-sm text-zinc-100">
                  <span className="font-semibold">{titleOf(kind, item)}</span>
                  <span className="text-zinc-400"> — {[orgOf(kind, item), item.place].filter(Boolean).join(", ")}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{formatPeriod(item)}</div>
                {item.description && <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 whitespace-pre-line">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => openEdit(item)}
                aria-label={t("Bewerken")}
                title={t("Bewerken")}
                className="size-11 sm:size-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                aria-label={t("Verwijderen")}
                title={t("Verwijderen")}
                className="size-11 sm:size-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ModalOverlay
          open
          onClose={() => setOpen(false)}
          label={editing ? t("Bewerken") : t("Toevoegen")}
          className="p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-8 max-w-2xl w-full my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">{editing ? t("Bewerken") : t("Toevoegen")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("Sluiten")}
                className="size-10 flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <label className="block">
                <span className="block text-zinc-400 mb-1">{isExp ? t("Functie") : t("Opleiding")}</span>
                <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} maxLength={200} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-zinc-400 mb-1">{isExp ? t("Bedrijf") : t("Instelling")}</span>
                  <input required value={form.organization} onChange={(e) => set("organization", e.target.value)} className={inputCls} maxLength={200} />
                </label>
                <label className="block">
                  <span className="block text-zinc-400 mb-1">{t("Plaats")}</span>
                  <input value={form.place} onChange={(e) => set("place", e.target.value)} className={inputCls} maxLength={120} />
                </label>
              </div>

              <fieldset className="grid grid-cols-2 gap-3">
                <legend className="text-zinc-400 mb-1">{t("Start")}</legend>
                <select aria-label={t("Startmaand")} value={form.startMonth} onChange={(e) => set("startMonth", Number(e.target.value))} className={inputCls}>
                  {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input aria-label={t("Startjaar")} type="number" min={1950} max={2100} value={form.startYear} onChange={(e) => set("startYear", e.target.value)} className={inputCls} />
              </fieldset>

              <fieldset className="grid grid-cols-2 gap-3">
                <legend className="text-zinc-400 mb-1">{t("Einde")}</legend>
                <select aria-label={t("Eindmaand")} disabled={form.isCurrent} value={form.endMonth} onChange={(e) => set("endMonth", Number(e.target.value))} className={`${inputCls} disabled:opacity-40`}>
                  {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input aria-label={t("Eindjaar")} type="number" min={1950} max={2100} disabled={form.isCurrent} value={form.endYear} onChange={(e) => set("endYear", e.target.value)} className={`${inputCls} disabled:opacity-40`} />
              </fieldset>

              <label className="flex items-center gap-2 min-h-[44px] sm:min-h-0 text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => set("isCurrent", e.target.checked)} className="size-4 accent-[#00e3a4]" />
                <span>{t("Loopt nog (toon HEDEN)")}</span>
              </label>

              <label className="block">
                <span className="block text-zinc-400 mb-1">{t("Omschrijving")}</span>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={10} maxLength={2000} className={`${inputCls} py-2 resize-y`} />
                <span className={`block mt-1 text-xs ${form.description.length > 250 ? "text-amber-400" : "text-zinc-500"}`}>
                  {form.description.length} / 250 {t("tekens aanbevolen")}
                </span>
              </label>

              {error && <p role="alert" className="text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] px-4 rounded-xl border border-border text-zinc-300 text-sm cursor-pointer">
                  {t("Annuleren")}
                </button>
                <button type="submit" disabled={saving} className="min-h-[44px] px-4 rounded-xl bg-brand text-zinc-950 text-sm font-semibold disabled:opacity-50 cursor-pointer">
                  {t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
