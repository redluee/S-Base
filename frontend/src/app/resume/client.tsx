"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2, FileText, ArrowUpRight } from "lucide-react";
import type { Resume } from "@backend/types/shared";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";

export function ResumeListClient({ initialResumes, libraryCount }: { initialResumes: Resume[]; libraryCount: number }) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initialResumes);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await api.resume.resumes.create({ name: name.trim(), selectAll: true });
      router.push(`/resume/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Er ging iets mis"));
      setBusy(false);
    }
  }

  async function handleDuplicate(id: number) {
    try {
      const copy = await api.resume.resumes.duplicate(id);
      setResumes((prev) => [copy, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Er ging iets mis"));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("Weet je zeker dat je dit CV wilt verwijderen?"))) return;
    try {
      await api.resume.resumes.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Er ging iets mis"));
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-zinc-100">{t("CV Builder")}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {t("Stel CV's samen uit je ervaring en opleidingen en exporteer ze als PDF.")}
        </p>
      </div>

      {libraryCount === 0 && (
        <div className="bg-zinc-900 border border-border rounded-2xl p-4 text-sm text-zinc-300 flex flex-wrap items-center gap-3">
          <span>{t("Begin met je profiel, ervaring en opleidingen invullen.")}</span>
          <Link href="/resume/profile" className="text-fuchsia-300 font-semibold hover:underline">{t("Profiel")}</Link>
          <Link href="/resume/experience" className="text-fuchsia-300 font-semibold hover:underline">{t("Ervaring")}</Link>
          <Link href="/resume/education" className="text-fuchsia-300 font-semibold hover:underline">{t("Opleidingen")}</Link>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("Naam van het nieuwe CV")}
          aria-label={t("Naam van het nieuwe CV")}
          maxLength={100}
          className="flex-1 min-h-[44px] rounded-xl bg-zinc-900 border border-border px-3 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-[44px] px-4 rounded-xl bg-brand text-zinc-950 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="size-4" />
          {t("Nieuw CV")}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {resumes.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Nog geen CV's. Maak er hierboven een aan.")}</p>
      ) : (
        <ul className="space-y-2">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center gap-2 bg-zinc-900 border border-border rounded-2xl p-2 pl-4">
              <FileText className="size-4 text-fuchsia-300 shrink-0" />
              <Link href={`/resume/${r.id}`} className="flex-1 min-w-0 py-2 group">
                <div className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white">{r.name}</div>
                <div className="text-xs text-zinc-500">
                  {t("Bijgewerkt")} {new Date(r.updatedAt).toLocaleDateString("nl-NL")}
                </div>
              </Link>
              <Link
                href={`/resume/${r.id}`}
                aria-label={t("Openen")}
                className="size-11 sm:size-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ArrowUpRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => handleDuplicate(r.id)}
                aria-label={t("Dupliceren")}
                title={t("Dupliceren")}
                className="size-11 sm:size-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <Copy className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
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
    </div>
  );
}
