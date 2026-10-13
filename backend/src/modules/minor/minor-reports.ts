import {
  eq,
  and,
  desc,
  inArray,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorStories,
  minorTeacherAssessments,
  minorPeerHelp,
  minorSettings,
} from "../../db/schema";
import type {
  MinorPeerHelp,
  MinorSettings,
  MinorDashboardStats,
} from "../../types/shared";
import {
  formatDate,
  parseDate,
} from "./minor-helpers";
import {
  MinorTransferService,
} from "./minor-transfer";

export class MinorReportService extends MinorTransferService {
  // --- Peer Help / Kennisdeling ---

  listPeerHelp(userId: number): MinorPeerHelp[] {
    return db.select().from(minorPeerHelp).where(eq(minorPeerHelp.userId, userId)).orderBy(desc(minorPeerHelp.date), desc(minorPeerHelp.id)).all() as MinorPeerHelp[];
  }

  createPeerHelp(userId: number, data: { sprintId?: number | null; date: string; peerName: string; description: string; links?: string }) {
    if (!data.peerName?.trim() || !data.description?.trim()) {
      throw new Error("Peer name and description are required");
    }
    return db.insert(minorPeerHelp).values({
      userId,
      sprintId: data.sprintId ?? null,
      date: data.date || formatDate(new Date()),
      peerName: data.peerName.trim(),
      description: data.description.trim(),
      links: data.links?.trim() || null,
    }).returning().get() as MinorPeerHelp;
  }

  updatePeerHelp(id: number, userId: number, data: { sprintId?: number | null; date?: string; peerName?: string; description?: string; links?: string }) {
    const existing = db.select().from(minorPeerHelp).where(and(eq(minorPeerHelp.id, id), eq(minorPeerHelp.userId, userId))).get();
    if (!existing) return null;
    return db.update(minorPeerHelp).set({
      sprintId: data.sprintId !== undefined ? data.sprintId : existing.sprintId,
      date: data.date ?? existing.date,
      peerName: data.peerName?.trim() ?? existing.peerName,
      description: data.description?.trim() ?? existing.description,
      links: data.links !== undefined ? (data.links?.trim() || null) : existing.links,
    }).where(eq(minorPeerHelp.id, id)).returning().get() as MinorPeerHelp;
  }

  deletePeerHelp(id: number, userId: number) {
    const existing = db.select().from(minorPeerHelp).where(and(eq(minorPeerHelp.id, id), eq(minorPeerHelp.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorPeerHelp).where(eq(minorPeerHelp.id, id)).run();
    return { success: true };
  }

  // --- Settings ---

  getSettings(userId: number): MinorSettings {
    const existing = db.select().from(minorSettings).where(eq(minorSettings.userId, userId)).get();
    if (existing) return existing as MinorSettings;
    return { userId, portfolioUrl: null, lastName: null };
  }

  saveSettings(userId: number, data: { portfolioUrl?: string | null; lastName?: string | null }): MinorSettings {
    const existing = db.select().from(minorSettings).where(eq(minorSettings.userId, userId)).get();
    const portfolioUrl = data.portfolioUrl !== undefined ? (data.portfolioUrl?.trim() || null) : (existing?.portfolioUrl ?? null);
    const lastName = data.lastName !== undefined ? (data.lastName?.trim() || null) : (existing?.lastName ?? null);
    if (existing) {
      return db.update(minorSettings).set({ portfolioUrl, lastName }).where(eq(minorSettings.userId, userId)).returning().get() as MinorSettings;
    }
    return db.insert(minorSettings).values({ userId, portfolioUrl, lastName }).returning().get() as MinorSettings;
  }

  // --- Dashboard Stats & Validation Warnings ---

  getDashboardStats(userId: number): MinorDashboardStats {
    const sprints = this.listSprints(userId);
    const today = formatDate(new Date());

    // Active sprint determination:
    // 1. Current running sprint covering today
    let activeSprint = sprints.find((s) => s.status === "active" && s.startDate <= today && s.endDate >= today) ?? null;
    if (!activeSprint) {
      activeSprint = sprints.find((s) => s.startDate <= today && s.endDate >= today) ?? null;
    }
    // 2. Nearest upcoming active sprint (or nearest upcoming sprint)
    if (!activeSprint) {
      const upcoming = sprints.filter((s) => s.startDate > today);
      if (upcoming.length > 0) {
        activeSprint = upcoming.find((s) => s.status === "active") ?? upcoming[0];
      }
    }
    // 3. Most recent past sprint
    if (!activeSprint && sprints.length > 0) {
      const pastActive = sprints.filter((s) => s.status === "active");
      activeSprint = pastActive.length > 0 ? pastActive[pastActive.length - 1] : sprints[sprints.length - 1];
    }

    let nextShowAndGrowDate: string | null = null;
    let daysUntilShowAndGrow: number | null = null;
    if (activeSprint) {
      nextShowAndGrowDate = activeSprint.showAndGrowDate;
      const todayDate = parseDate(today);
      const sgDate = parseDate(activeSprint.showAndGrowDate);
      const diffTime = sgDate.getTime() - todayDate.getTime();
      daysUntilShowAndGrow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Official passes: count teacher assessments with 'V' across all user sprints (max 1 per sprint)
    const officialPasses: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const projectedPasses: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const LU_MIN_TARGETS: Record<number, number> = {
      1: 2,
      2: 4,
      3: 2,
      4: 4,
      5: 6,
    };

    const sprintIds = sprints.map((s) => s.id);
    if (sprintIds.length > 0) {
      const allAssessments = db.select().from(minorTeacherAssessments).where(inArray(minorTeacherAssessments.sprintId, sprintIds)).all();

      for (const s of sprints) {
        const isFinished = s.status === "completed" || s.endDate < today;
        const sprintAssessments = allAssessments.filter((a) => a.sprintId === s.id);

        for (const a of sprintAssessments) {
          if (a.assessment === "V" && a.learningOutcome >= 1 && a.learningOutcome <= 5) {
            officialPasses[a.learningOutcome] = (officialPasses[a.learningOutcome] || 0) + 1;
          }
        }

        if (isFinished) {
          for (const a of sprintAssessments) {
            if (a.assessment === "V" && a.learningOutcome >= 1 && a.learningOutcome <= 5) {
              projectedPasses[a.learningOutcome] = (projectedPasses[a.learningOutcome] || 0) + 1;
            }
          }
        } else {
          const officiallyPassedInSprint = new Set<number>();
          for (const a of sprintAssessments) {
            if (a.assessment === "V" && a.learningOutcome >= 1 && a.learningOutcome <= 5) {
              projectedPasses[a.learningOutcome] = (projectedPasses[a.learningOutcome] || 0) + 1;
              officiallyPassedInSprint.add(a.learningOutcome);
            }
          }

          const stories = db.select().from(minorStories).where(eq(minorStories.sprintId, s.id)).all();
          const coveredLUs = new Set<number>();
          for (const st of stories) {
            try {
              const lus = JSON.parse(st.learningOutcomes);
              if (Array.isArray(lus)) {
                lus.forEach((lu) => {
                  if (typeof lu === "number" && lu >= 1 && lu <= 5) {
                    coveredLUs.add(lu);
                  }
                });
              }
            } catch {}
          }

          for (const lu of coveredLUs) {
            const isAssessedO = sprintAssessments.some((a) => a.learningOutcome === lu && a.assessment === "O");
            if (!officiallyPassedInSprint.has(lu) && !isAssessedO) {
              projectedPasses[lu] = (projectedPasses[lu] || 0) + 1;
            }
          }
        }
      }
    }

    // Active Sprint Warnings
    let activeSprintWarnings = null;
    if (activeSprint) {
      const activeStories = db.select().from(minorStories).where(eq(minorStories.sprintId, activeSprint.id)).all();
      const uniqueLUs = new Set<number>();
      for (const st of activeStories) {
        try {
          const lus = JSON.parse(st.learningOutcomes);
          if (Array.isArray(lus)) {
            lus.forEach((lu) => {
              if (typeof lu === "number" && lu >= 1 && lu <= 5) uniqueLUs.add(lu);
            });
          }
        } catch {}
      }

      activeSprintWarnings = {
        fewLearningOutcomes: uniqueLUs.size < 3,
        missingLU5: !uniqueLUs.has(5),
        uniqueLUsCount: uniqueLUs.size,
      };
    }

    const recentPeerHelp = this.listPeerHelp(userId).slice(0, 5);

    return {
      activeSprint,
      nextShowAndGrowDate,
      daysUntilShowAndGrow,
      officialPasses,
      projectedPasses,
      totalSprints: sprints.length,
      activeSprintWarnings,
      recentPeerHelp,
    };
  }
}
