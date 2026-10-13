"use client";

import { Users, X } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";

interface PeerHelpModalProps {
  peerDate: string;
  setPeerDate: (v: string) => void;
  peerName: string;
  setPeerName: (v: string) => void;
  peerDesc: string;
  setPeerDesc: (v: string) => void;
  peerLinks: string;
  setPeerLinks: (v: string) => void;
  savingPeer: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PeerHelpModal({ peerDate, setPeerDate, peerName, setPeerName, peerDesc, setPeerDesc, peerLinks, setPeerLinks, savingPeer, onClose, onSubmit }: PeerHelpModalProps) {
  return (
      <ModalOverlay
        open
        onClose={() => onClose()}
        label={t("Kennisdeling Registreren")}
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="size-4 text-purple-400" />
              <span>{t("Kennisdeling Registreren")}</span>
            </h3>
            <button
              type="button"
              onClick={() => onClose()}
              className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
              title={t("Sluiten")}
              aria-label={t("Sluiten")}
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">{t("Datum")}</label>
              <input
                type="date"
                value={peerDate}
                onChange={(e) => setPeerDate(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">{t("Naam medestudent")}</label>
              <input
                type="text"
                placeholder="bijv. Lisa van Dijk"
                value={peerName}
                onChange={(e) => setPeerName(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">{t("Toelichting geboden hulp")}</label>
              <textarea
                rows={3}
                placeholder="Wat heb je uitgelegd, gereviewed of opgelost?"
                value={peerDesc}
                onChange={(e) => setPeerDesc(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">{t("Links naar documentatie/code (optioneel)")}</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={peerLinks}
                onChange={(e) => setPeerLinks(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                {t("Annuleren")}
              </button>
              <button
                type="submit"
                disabled={savingPeer}
                className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
              >
                {savingPeer ? t("Opslaan...") : t("Opslaan")}
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
  );
}
