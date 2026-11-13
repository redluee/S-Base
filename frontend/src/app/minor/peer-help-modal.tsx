"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import { today } from "@backend/shared/minor";
import { api, apiErrorMessage, type MinorPeerHelp, type MinorSprint } from "@/lib/api";
import { t } from "@/lib/lang";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModalOverlay } from "@/components/ui/modal-overlay";

const FIELD = "w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand";

export function PeerHelpModal({
  entry,
  defaultSprintId = null,
  sprints,
  onClose,
  onSaved,
}: {
  entry: MinorPeerHelp | null;
  defaultSprintId?: number | null;
  sprints: MinorSprint[];
  onClose: () => void;
  onSaved: (saved: MinorPeerHelp) => void;
}) {
  const [date, setDate] = useState(entry?.date ?? today());
  const [sprintId, setSprintId] = useState<number | null>(entry ? entry.sprintId : defaultSprintId);
  const [peerName, setPeerName] = useState(entry?.peerName ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [links, setLinks] = useState(entry?.links ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = entry ? t("Kennisdeling Bewerken") : t("Kennisdeling Registreren");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!peerName.trim() || !description.trim()) return;
    setSaving(true);
    setError(null);
    const data = {
      date,
      sprintId,
      peerName: peerName.trim(),
      description: description.trim(),
      links: links.trim() || undefined,
    };
    try {
      onSaved(entry ? await api.minor.peerHelp.update(entry.id, data) : await api.minor.peerHelp.create(data));
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "minor.actionFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay open onClose={onClose} label={title} className="p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="size-4 text-purple-400" />
            <span>{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-zinc-400 mb-1">{t("Datum")}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} required />
            </label>
            <label className="block">
              <span className="block text-zinc-400 mb-1">{t("Gekoppelde sprint (optioneel)")}</span>
              <select
                value={sprintId ?? ""}
                onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : null)}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="">{t("Geen sprint")}</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startDate})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-zinc-400 mb-1">{t("Naam medestudent")}</span>
            <input
              type="text"
              placeholder={t("bijv. Lisa van Dijk")}
              value={peerName}
              onChange={(e) => setPeerName(e.target.value)}
              className={FIELD}
              required
            />
          </label>

          <label className="block">
            <span className="block text-zinc-400 mb-1">{t("Toelichting geboden hulp")}</span>
            <textarea
              rows={3}
              placeholder={t("Wat heb je uitgelegd, gereviewed of opgelost?")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={FIELD}
              required
            />
          </label>

          <label className="block">
            <span className="block text-zinc-400 mb-1">{t("Links naar documentatie/code (optioneel)")}</span>
            <input
              type="url"
              placeholder="https://github.com/..."
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              className={FIELD}
            />
          </label>

          <InlineAlert>{error}</InlineAlert>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer">
              {t("Annuleren")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? t("Opslaan...") : t("Opslaan")}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
