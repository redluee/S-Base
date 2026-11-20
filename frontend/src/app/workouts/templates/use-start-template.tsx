"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { SessionConflictDialog } from "@/app/workouts/session/session-conflict-dialog";
import { parseSessionConflict, type ActiveSessionInfo } from "@/app/workouts/session/session-conflict";

export function useStartTemplate() {
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{ templateId: number; session: ActiveSessionInfo } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startingRef = useRef(false);

  async function start(templateId: number) {
    if (startingRef.current) return;
    startingRef.current = true;
    setStartingId(templateId);
    setError(null);
    try {
      const session = await api.workouts.sessions.create(templateId);
      router.push(`/workouts/session/${session.sessionId}`);
      router.refresh();
    } catch (err) {
      const active = parseSessionConflict(err);
      if (active) {
        setConflict({ templateId, session: active });
      } else {
        console.error("Failed to start workout", err);
        setError(t("Failed to start workout. Please try again."));
      }
      startingRef.current = false;
      setStartingId(null);
    }
  }

  const dialog = conflict ? (
    <SessionConflictDialog
      key={conflict.session.sessionId}
      session={conflict.session}
      busy={startingId !== null}
      onResume={() => router.push(`/workouts/session/${conflict.session.sessionId}`)}
      onStartNew={async () => {
        setConflict(null);
        await start(conflict.templateId);
      }}
      onCancel={() => setConflict(null)}
    />
  ) : null;

  return { start, startingId, error, dialog };
}
