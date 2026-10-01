import { parseDateString } from "./utils";

export interface TimedSession {
  startedAt: string;
  completedAt?: string | null;
  pausedAt?: string | null;
  pausedSeconds?: number | null;
}

export function sessionElapsedSeconds(session: TimedSession, nowMs: number): number {
  const startMs = parseDateString(session.startedAt).getTime();
  if (session.completedAt) {
    return Math.max(0, Math.floor((parseDateString(session.completedAt).getTime() - startMs) / 1000));
  }
  let pausedMs = (session.pausedSeconds ?? 0) * 1000;
  if (session.pausedAt) pausedMs += Math.max(0, nowMs - parseDateString(session.pausedAt).getTime());
  return Math.max(0, Math.floor((nowMs - startMs - pausedMs) / 1000));
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
