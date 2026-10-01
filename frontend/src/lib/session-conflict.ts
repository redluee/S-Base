import { ApiError } from "./api";

export interface ActiveSessionInfo {
  sessionId: number;
  templateId: number | null;
  name: string | null;
  startedAt: string;
  exerciseCount: number;
  completedSetsCount: number;
}

export function parseSessionConflict(err: unknown): ActiveSessionInfo | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const info = err.data?.activeSession as Partial<ActiveSessionInfo> | undefined;
  if (!info || typeof info.sessionId !== "number") return null;
  return {
    sessionId: info.sessionId,
    templateId: info.templateId ?? null,
    name: info.name ?? null,
    startedAt: info.startedAt ?? "",
    exerciseCount: info.exerciseCount ?? 0,
    completedSetsCount: info.completedSetsCount ?? 0,
  };
}

export type ConflictResolution = "complete" | "delete";

interface LocalSessionSnapshot {
  exercises?: { sets?: { completed?: number | null }[] | null }[] | null;
}

export function hasLocalCompletedSets(local: LocalSessionSnapshot | null | undefined): boolean {
  return Boolean(local?.exercises?.some((ex) => ex.sets?.some((s) => s.completed === 1)));
}

export function conflictResolution(
  info: Pick<ActiveSessionInfo, "completedSetsCount">,
  local?: LocalSessionSnapshot | null
): ConflictResolution {
  return info.completedSetsCount > 0 || hasLocalCompletedSets(local) ? "complete" : "delete";
}

export interface CloseSessionClient {
  complete: (id: number) => Promise<unknown>;
  delete: (id: number) => Promise<unknown>;
  syncLocal?: (id: number) => Promise<unknown>;
  clearLocal?: (id: number, resolution: ConflictResolution) => void;
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export async function closeConflictingSession(
  info: ActiveSessionInfo,
  resolution: ConflictResolution,
  client: CloseSessionClient
): Promise<void> {
  try {
    if (resolution === "complete") {
      if (client.syncLocal) {
        try {
          await client.syncLocal(info.sessionId);
        } catch {
          // fall through: the server copy is completed as-is
        }
      }
      await client.complete(info.sessionId);
    } else {
      await client.delete(info.sessionId);
    }
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  client.clearLocal?.(info.sessionId, resolution);
}
