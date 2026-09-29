"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import type { ResumeProfile, ResumeLink } from "@backend/types/shared";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";

const inputCls =
  "w-full min-h-[44px] sm:min-h-[36px] rounded-lg bg-zinc-950 border border-border px-3 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 border border-border rounded-2xl p-4 sm:p-5 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

export function ResumeProfileClient({ initialProfile }: { initialProfile: ResumeProfile }) {
  const [p, setP] = useState(initialProfile);
  const [lists, setLists] = useState({
    skills: initialProfile.skills.join("\n"),
    languages: initialProfile.languages.join("\n"),
    hobbies: initialProfile.hobbies.join("\n"),
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ResumeProfile>(key: K, value: ResumeProfile[K]) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  };

  const toLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

  function updateLink(i: number, patch: Partial<ResumeLink>) {
    set("links", p.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const saved = await api.resume.profile.update({
        fullName: p.fullName,
        headline: p.headline,
        photoShape: p.photoShape,
        residence: p.residence,
        phone: p.phone,
        email: p.email,
        birthDate: p.birthDate,
        drivingLicense: p.drivingLicense,
        links: p.links,
        skills: toLines(lists.skills),
        languages: toLines(lists.languages),
        hobbies: toLines(lists.hobbies),
      });
      setP(saved);
      setStatus("saved");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("Er ging iets mis"));
    }
  }

  async function handlePhoto(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const saved = await api.resume.profile.uploadPhoto(file);
      set("photoPath", saved.photoPath);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("Uploaden mislukt"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    try {
      await api.resume.profile.deletePhoto();
      set("photoPath", null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("Er ging iets mis"));
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <h1 className="font-display text-3xl sm:text-4xl text-zinc-100">{t("Profiel")}</h1>

      <Section title={t("Profielfoto")}>
        <div className="flex items-center gap-4">
          <div
            className={`size-24 bg-zinc-800 border border-border overflow-hidden shrink-0 flex items-center justify-center text-zinc-600 text-xs ${
              p.photoShape === "circle" ? "rounded-full" : "rounded-md"
            }`}
          >
            {p.photoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoPath} alt={t("Profielfoto")} className="size-full object-cover" />
            ) : (
              t("Geen foto")
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="min-h-[44px] sm:min-h-[36px] px-3 rounded-lg border border-border text-sm text-zinc-200 flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="size-4" />
                {uploading ? t("Uploaden...") : t("Foto kiezen")}
              </button>
              {p.photoPath && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="min-h-[44px] sm:min-h-[36px] px-3 rounded-lg border border-border text-sm text-zinc-400 hover:text-red-400 cursor-pointer"
                >
                  {t("Verwijderen")}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
                e.target.value = "";
              }}
            />
            <div role="radiogroup" aria-label={t("Vorm")} className="flex gap-2">
              {(["circle", "square"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  role="radio"
                  aria-checked={p.photoShape === shape}
                  onClick={() => set("photoShape", shape)}
                  className={`min-h-[44px] sm:min-h-[32px] px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                    p.photoShape === shape
                      ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300"
                      : "border-border text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {shape === "circle" ? t("Rond") : t("Vierkant")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title={t("Persoonsgegevens")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("Volledige naam")}>
            <input className={inputCls} value={p.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={120} />
          </Field>
          <Field label={t("Ondertitel")}>
            <input className={inputCls} value={p.headline} onChange={(e) => set("headline", e.target.value)} maxLength={200} />
          </Field>
          <Field label={t("Woonplaats")}>
            <input className={inputCls} value={p.residence} onChange={(e) => set("residence", e.target.value)} maxLength={120} />
          </Field>
          <Field label={t("Telefoonnummer")}>
            <input className={inputCls} value={p.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
          </Field>
          <Field label={t("Email")}>
            <input className={inputCls} type="email" value={p.email} onChange={(e) => set("email", e.target.value)} maxLength={200} />
          </Field>
          <Field label={t("Geboortedatum")}>
            <input className={inputCls} value={p.birthDate} onChange={(e) => set("birthDate", e.target.value)} placeholder={t("bijv. 1 januari 2000")} maxLength={60} />
          </Field>
          <Field label={t("Rijbewijs")}>
            <input className={inputCls} value={p.drivingLicense} onChange={(e) => set("drivingLicense", e.target.value)} maxLength={40} />
          </Field>
        </div>

        <div className="space-y-2 pt-1">
          <span className="block text-xs text-zinc-400">{t("Online")}</span>
          {p.links.map((l, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <input aria-label={t("Label")} className={`${inputCls} sm:w-40`} placeholder={t("Label")} value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })} />
              <input aria-label={t("URL")} className={inputCls} placeholder="https://" value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
              <button
                type="button"
                onClick={() => set("links", p.links.filter((_, idx) => idx !== i))}
                aria-label={t("Verwijderen")}
                className="size-11 sm:size-9 shrink-0 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("links", [...p.links, { label: "", url: "" }])}
            className="min-h-[44px] sm:min-h-[32px] px-3 rounded-lg border border-border text-xs text-zinc-300 flex items-center gap-1.5 hover:bg-zinc-800 cursor-pointer"
          >
            <Plus className="size-3.5" />
            {t("Link toevoegen")}
          </button>
        </div>
      </Section>

      <Section title={`${t("Vaardigheden")}, ${t("Talen")} & ${t("Hobby's")}`}>
        <p className="text-xs text-zinc-500">{t("Eén regel per item. Deze staan op elk CV.")}</p>
        {(
          [
            ["skills", t("Vaardigheden")],
            ["languages", t("Talen")],
            ["hobbies", t("Hobby's")],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <textarea
              rows={4}
              className={`${inputCls} py-2 resize-y`}
              value={lists[key]}
              onChange={(e) => {
                setLists((prev) => ({ ...prev, [key]: e.target.value }));
                setStatus("idle");
              }}
            />
          </Field>
        ))}
      </Section>

      <div className="flex items-center gap-3 sticky bottom-0 py-3 bg-background/90 backdrop-blur">
        <button
          type="submit"
          disabled={status === "saving"}
          className="min-h-[44px] px-5 rounded-xl bg-brand text-zinc-950 text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {status === "saving" ? t("Opslaan...") : t("Opslaan")}
        </button>
        <span role="status" className="text-xs text-zinc-400">
          {status === "saved" && t("Opgeslagen")}
          {status === "error" && <span className="text-red-400">{message}</span>}
        </span>
      </div>
    </form>
  );
}
