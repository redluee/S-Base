"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  initOfflineWorkoutSync,
  listRejectedOfflineSessions,
  retryOfflineSession,
  clearOfflineSession,
  readSyncWarnings,
  dismissSyncWarning,
  OFFLINE_SYNC_EVENT,
  type SyncWarning,
} from "@/lib/offline-workout";
import { t } from "@/lib/lang";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface RejectedItem {
  sessionId: number;
  name: string;
  error: string;
}

export function OfflineSyncProvider() {
  const [rejected, setRejected] = useState<RejectedItem[]>([]);
  const [warnings, setWarnings] = useState<SyncWarning[]>([]);
  const [discardTarget, setDiscardTarget] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setRejected(
      listRejectedOfflineSessions().map((d) => ({
        sessionId: d.sessionId,
        name: d.session?.name || t("Workout Session"),
        error: d.syncError ?? "",
      }))
    );
    setWarnings(readSyncWarnings());
  }, []);

  useEffect(() => {
    const cleanup = initOfflineWorkoutSync();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    window.addEventListener(OFFLINE_SYNC_EVENT, refresh);
    return () => {
      window.removeEventListener(OFFLINE_SYNC_EVENT, refresh);
      cleanup();
    };
  }, [refresh]);

  if (rejected.length === 0 && warnings.length === 0) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md flex flex-col gap-3 rounded-lg border border-red-500/40 bg-card p-4 shadow-none"
    >
      {warnings.map((warning) => (
        <div key={warning.id} className="flex flex-col gap-2 min-w-0">
          <p className="text-sm text-foreground break-words">{t(warning.message)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dismissSyncWarning(warning.id)}
              className="min-h-11 min-w-11 px-4 rounded-md border border-border text-sm text-foreground"
            >
              {t("Dismiss")}
            </button>
          </div>
        </div>
      ))}
      {rejected.map((item) => (
        <div key={item.sessionId} className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-semibold text-foreground break-words">
            {t("Workout not synced")}: {item.name}
          </p>
          <p className="text-xs text-muted-foreground break-words">
            {t("The server rejected your offline changes and automatic retrying has stopped.")}
            {item.error ? ` (${item.error})` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => retryOfflineSession(item.sessionId).then(refresh)}
              className="min-h-11 min-w-11 px-4 rounded-md bg-brand text-zinc-900 text-sm font-semibold"
            >
              {t("Retry sync")}
            </button>
            <Link
              href={`/workouts/session/${item.sessionId}`}
              className="min-h-11 min-w-11 px-4 inline-flex items-center rounded-md border border-border text-sm text-foreground"
            >
              {t("Open workout")}
            </Link>
            <button
              type="button"
              onClick={() => setDiscardTarget(item.sessionId)}
              className="min-h-11 min-w-11 px-4 rounded-md border border-red-500/40 text-sm text-red-400"
            >
              {t("Discard local changes")}
            </button>
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={discardTarget !== null}
        title={t("Discard local changes")}
        description={t("Discard the unsynced local changes? The last version on the server is kept.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Discard local changes")}
        tone="destructive"
        onCancel={() => setDiscardTarget(null)}
        onConfirm={() => {
          if (discardTarget !== null) clearOfflineSession(discardTarget);
          setDiscardTarget(null);
        }}
      />
    </div>
  );
}
