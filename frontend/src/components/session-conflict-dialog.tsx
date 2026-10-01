"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { parseDateString } from "@/lib/utils";
import { clearOfflineSession, getOfflineSession, syncOfflineSession } from "@/lib/offline-workout";
import { clearSetTimerSnapshot } from "@/lib/set-timer";
import {
  closeConflictingSession,
  conflictResolution,
  type ActiveSessionInfo,
  type CloseSessionClient,
} from "@/lib/session-conflict";

const closeClient: CloseSessionClient = {
  complete: (id) => api.workouts.sessions.complete(id),
  delete: (id) => api.workouts.sessions.delete(id),
  syncLocal: async (id) => {
    if (getOfflineSession(id)?.pendingSync) await syncOfflineSession(id, true);
  },
  clearLocal: (id, resolution) => {
    clearSetTimerSnapshot(id);
    if (resolution === "delete") clearOfflineSession(id);
  },
};

export function SessionConflictDialog({
  session,
  busy,
  onResume,
  onStartNew,
  onCancel,
}: {
  session: ActiveSessionInfo;
  busy: boolean;
  onResume: () => void;
  onStartNew: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution] = useState(() => conflictResolution(session, getOfflineSession(session.sessionId)?.session));
  const disabled = busy || closing;

  const startedLabel = session.startedAt
    ? parseDateString(session.startedAt).toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  async function handleCloseAndStart() {
    if (disabled) return;
    setClosing(true);
    setError(null);
    try {
      await closeConflictingSession(session, resolution, closeClient);
    } catch (err) {
      console.error("Failed to close running session", err);
      setError(
        resolution === "complete"
          ? t("Could not finish the running workout. Please try again.")
          : t("Could not delete the running workout. Please try again.")
      );
      setClosing(false);
      return;
    }
    await onStartNew();
    setClosing(false);
  }

  return (
    <ModalOverlay
      open
      onClose={disabled ? () => {} : onCancel}
      label={t("A workout is already running")}
      labelledBy="session-conflict-title"
    >
      <div className="bg-popover ring-1 ring-foreground/10 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 text-center">
        <h3 id="session-conflict-title" className="font-semibold text-lg text-foreground">
          {t("A workout is already running")}
        </h3>
        <p className="text-sm text-muted-foreground break-words">
          {t("You already have an active workout: {name}. Resume it, or close it to start a new one.", {
            name: session.name || t("Workout Session"),
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {startedLabel ? `${t("Started")} ${startedLabel} · ` : ""}
          {session.completedSetsCount} {t("sets completed")}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={onResume}
            disabled={disabled}
            className="min-h-11 bg-brand text-zinc-950 font-semibold hover:bg-brand-hover"
          >
            {t("Resume workout")}
          </Button>
          <p
            id="session-conflict-consequence"
            className={
              resolution === "delete"
                ? "mt-1 text-xs text-destructive break-words"
                : "mt-1 text-xs text-muted-foreground break-words"
            }
          >
            {resolution === "complete"
              ? t("The running workout will be finished and saved to your history.")
              : t("The running workout has no completed sets and will be permanently deleted.")}
          </p>
          <Button
            onClick={handleCloseAndStart}
            disabled={disabled}
            variant="outline"
            aria-describedby="session-conflict-consequence"
            className={
              resolution === "delete"
                ? "min-h-11 h-auto py-2 whitespace-normal border-destructive/60 text-destructive hover:bg-destructive/10"
                : "min-h-11 h-auto py-2 whitespace-normal"
            }
          >
            {closing
              ? t("Bezig...")
              : resolution === "complete"
                ? t("Finish old and start new")
                : t("Delete old and start new")}
          </Button>
          <InlineAlert>{error}</InlineAlert>
          <Button
            onClick={onCancel}
            disabled={disabled}
            variant="ghost"
            className="min-h-11 text-muted-foreground hover:bg-white/5"
          >
            {t("Cancel")}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
