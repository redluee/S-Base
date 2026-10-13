"use client";

import { Plus, Upload } from "lucide-react";

import { t } from "@/lib/lang";
import type { useStoryEditor } from "./use-story-editor";

interface StoryEditEvidenceProps {
  editor: ReturnType<typeof useStoryEditor>;
}

export function StoryEditEvidence({ editor }: StoryEditEvidenceProps) {
  const { evidenceList, setEvidenceList, uploadingFile, handleFileUpload } = editor;
  return (
        <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200 text-sm">{t("Bewijsstukken & resultaten (GitHub, Live URL, Document)")}</span>
            <div className="flex items-center gap-3">
              <label className="text-xs sm:text-sm text-brand hover:underline cursor-pointer flex items-center gap-1.5">
                <Upload className="size-3.5" />
                <span>{uploadingFile ? t("Uploaden...") : t("Document")}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setEvidenceList((prev) => [...prev, { type: "github", title: "", url: "" }])}
                className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm cursor-pointer font-medium"
              >
                <Plus className="size-3.5" />
                <span>{t("Link")}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden pr-2">
            {evidenceList.map((ev, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-2 sm:items-center">
                <div className="flex items-center gap-2">
                  <select
                    value={ev.type}
                    onChange={(e) => {
                      const val = e.target.value as "link" | "github" | "document" | "app";
                      setEvidenceList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, type: val } : item))
                      );
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="github">GitHub</option>
                    <option value="document">Document</option>
                    <option value="app">Live URL</option>
                    <option value="link">Link</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setEvidenceList((prev) => prev.filter((_, i) => i !== idx))}
                    className="sm:hidden text-zinc-400 hover:text-red-400 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    title={t("Verwijderen")}
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Titel/Omschrijving"
                  value={ev.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvidenceList((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                    );
                  }}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-brand"
                />
                <input
                  type="text"
                  placeholder="https://... of /api/uploads/..."
                  value={ev.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvidenceList((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                    );
                  }}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-brand font-mono"
                />
                <div className="hidden sm:flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEvidenceList((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-zinc-400 hover:text-red-400 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    title={t("Verwijderen")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
  );
}
