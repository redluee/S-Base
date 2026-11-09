import { and, desc, eq } from "drizzle-orm";
import db from "../../db/client";
import { minorPeerHelp } from "../../db/schema";
import type { MinorPeerHelp } from "../../types/shared";
import { orNotFound, ValidationError } from "../../utils/errors";
import { formatDate } from "./minor-helpers";

export interface PeerHelpInput {
  sprintId?: number | null;
  date?: string;
  peerName?: string;
  description?: string;
  links?: string | null;
}

export class MinorPeerHelpLog {
  list(userId: number): MinorPeerHelp[] {
    return db
      .select()
      .from(minorPeerHelp)
      .where(eq(minorPeerHelp.userId, userId))
      .orderBy(desc(minorPeerHelp.date), desc(minorPeerHelp.id))
      .all() as MinorPeerHelp[];
  }

  create(userId: number, data: PeerHelpInput) {
    if (!data.peerName?.trim() || !data.description?.trim()) throw new ValidationError("minor.peerHelpFieldsRequired");
    return db
      .insert(minorPeerHelp)
      .values({
        userId,
        sprintId: data.sprintId ?? null,
        date: data.date || formatDate(new Date()),
        peerName: data.peerName.trim(),
        description: data.description.trim(),
        links: data.links?.trim() || null,
      })
      .returning()
      .get() as MinorPeerHelp;
  }

  update(id: number, userId: number, data: PeerHelpInput) {
    const existing = this.requireOwned(id, userId);
    return db
      .update(minorPeerHelp)
      .set({
        sprintId: data.sprintId !== undefined ? data.sprintId : existing.sprintId,
        date: data.date ?? existing.date,
        peerName: data.peerName?.trim() ?? existing.peerName,
        description: data.description?.trim() ?? existing.description,
        links: data.links !== undefined ? data.links?.trim() || null : existing.links,
      })
      .where(eq(minorPeerHelp.id, id))
      .returning()
      .get() as MinorPeerHelp;
  }

  remove(id: number, userId: number) {
    this.requireOwned(id, userId);
    db.delete(minorPeerHelp).where(eq(minorPeerHelp.id, id)).run();
    return { success: true };
  }

  private requireOwned(id: number, userId: number) {
    return orNotFound(
      db
        .select()
        .from(minorPeerHelp)
        .where(and(eq(minorPeerHelp.id, id), eq(minorPeerHelp.userId, userId)))
        .get(),
      "minor.peerHelpNotFound",
    );
  }
}
