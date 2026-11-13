import { parseDateString } from "@backend/shared/dates";
import { activeSeconds } from "@backend/shared/workout";

export interface TimedSession {
  startedAt: string;
  completedAt?: string | null;
  pausedAt?: string | null;
  pausedSeconds?: number | null;
}

export function sessionElapsedSeconds(session: TimedSession, nowMs: number): number {
  return Math.floor(
    activeSeconds(
      {
        startedAt: session.startedAt,
        completedAt: session.completedAt ?? null,
        pausedAt: session.pausedAt ?? null,
        pausedSeconds: session.pausedSeconds ?? 0,
      },
      nowMs,
    ),
  );
}

export function pauseSession<T extends TimedSession>(session: T, nowMs: number): T {
  if (session.pausedAt) return session;
  return { ...session, pausedAt: new Date(nowMs).toISOString() };
}

export function resumeSession<T extends TimedSession>(session: T, nowMs: number): T {
  if (!session.pausedAt) return session;
  const pausedFor = Math.max(0, Math.round((nowMs - parseDateString(session.pausedAt).getTime()) / 1000));
  return { ...session, pausedAt: null, pausedSeconds: (session.pausedSeconds ?? 0) + pausedFor };
}

export function formatSessionDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  if (secs < 60) return `${secs} s`;
  const totalMinutes = Math.round(secs / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} u` : `${hours} u ${minutes} min`;
}
