import {
  eq,
  and,
  sql,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorSprints,
  minorStories,
  minorSelfEvaluations,
  minorFeedbackEntries,
} from "../../db/schema";
import type {
  MinorSprint,
  MinorSprintFull,
  MinorSelfEvaluation,
  MinorSprintExportData,
  MinorSprintExportStory,
} from "../../types/shared";
import {
  formatDate,
  calculateSprintStatus,
} from "./minor-helpers";
import {
  MinorSprintService,
} from "./minor-sprints";

export class MinorTransferService extends MinorSprintService {
  exportSprint(sprintId: number, userId: number): MinorSprintExportData | null {
    const sprint = this.getSprintById(sprintId, userId);
    if (!sprint) return null;

    const stories: MinorSprintExportStory[] = (sprint.stories || []).map((s) => ({
      storyTypeCode: s.storyTypeCode,
      storyNumber: s.storyNumber || undefined,
      title: s.title,
      asA: s.asA || undefined,
      iWant: s.iWant || undefined,
      soThat: s.soThat || undefined,
      learningOutcomes: s.learningOutcomes,
      status: s.status,
      orderIndex: s.orderIndex,
      presentationData: s.presentationData || undefined,
      acceptanceCriteria: (s.criteria || [])
        .filter((c) => c.type === "acceptance")
        .map((c) => ({
          text: c.text,
          isCompleted: c.isCompleted,
          indent: c.indent ?? 0,
        })),
      qualityCriteria: (s.criteria || [])
        .filter((c) => c.type === "quality")
        .map((c) => ({
          text: c.text,
          isCompleted: c.isCompleted,
          indent: c.indent ?? 0,
        })),
      evidence: (s.evidence || []).map((e) => ({
        type: e.type,
        title: e.title,
        url: e.url,
      })),
    }));

    const feedback = (sprint.feedback || []).map((f) => ({
      date: f.date,
      fromWhom: f.fromWhom,
      feedback: f.feedback,
      action: f.action,
      orderIndex: f.orderIndex,
    }));

    const selfEvaluations = (sprint.selfEvaluations || []).map((se) => ({
      learningOutcome: se.learningOutcome,
      level: se.level,
      argumentation: se.argumentation || null,
    }));

    const teacherAssessments = (sprint.teacherAssessments || []).map((ta) => ({
      learningOutcome: ta.learningOutcome,
      assessment: ta.assessment,
      notes: ta.notes || null,
      evaluatedAt: ta.evaluatedAt || null,
    }));

    const reflection = sprint.reflection
      ? {
          date: sprint.reflection.date,
          whatLearned: sprint.reflection.whatLearned || null,
          whatRetained: sprint.reflection.whatRetained || null,
          whatChange: sprint.reflection.whatChange || null,
        }
      : null;

    return {
      version: 1,
      sprintNumber: sprint.sprintNumber,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      durationDays: sprint.durationDays,
      showAndGrowDate: sprint.showAndGrowDate,
      extendedDays: sprint.extendedDays,
      extensionReason: sprint.extensionReason,
      status: sprint.status,
      stories,
      feedback,
      selfEvaluations,
      teacherAssessments,
      reflection,
    };
  }

  importSprint(userId: number, rawData: any, targetSprintId?: number, overwrite?: boolean): MinorSprintFull {
    if (!rawData || typeof rawData !== "object") {
      throw new Error("Invalid sprint JSON payload");
    }

    const data = (rawData.sprint && typeof rawData.sprint === "object") ? rawData.sprint : rawData;
    const shouldOverwrite = Boolean(overwrite ?? rawData.overwrite ?? data.overwrite);
    const customName = (rawData.customName ?? data.customName ?? data.name)?.trim();
    const customNumber = (rawData.customSprintNumber ?? data.customSprintNumber ?? data.sprintNumber)?.trim();

    let sprintId: number;

    const resolvedTargetId = targetSprintId ?? rawData.targetSprintId ?? data.targetSprintId;

    if (resolvedTargetId && Number(resolvedTargetId) > 0) {
      const existing = db.select().from(minorSprints).where(and(eq(minorSprints.id, Number(resolvedTargetId)), eq(minorSprints.userId, userId))).get();
      if (!existing) throw new Error("Target sprint not found");
      sprintId = existing.id;

      if (shouldOverwrite) {
        const startDate = data.startDate ? String(data.startDate).trim() : existing.startDate;
        const durationDays = typeof data.durationDays === "number" && data.durationDays > 0 ? data.durationDays : existing.durationDays;
        const calc = this.calculateSprintDates(userId, startDate, durationDays);
        const endDate = data.endDate ? String(data.endDate).trim() : calc.endDate;
        const showAndGrowDate = data.showAndGrowDate ? String(data.showAndGrowDate).trim() : calc.showAndGrowDate;
        const extendedDays = typeof data.extendedDays === "number" ? data.extendedDays : calc.extendedDays;
        const extensionReason = data.extensionReason !== undefined ? data.extensionReason : calc.extensionReason;
        const status = calculateSprintStatus(startDate, endDate);

        db.update(minorSprints).set({
          sprintNumber: customNumber || existing.sprintNumber,
          name: customName || existing.name,
          startDate,
          endDate,
          durationDays,
          showAndGrowDate,
          extendedDays,
          extensionReason,
          status,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(minorSprints.id, sprintId)).run();

        db.delete(minorStories).where(eq(minorStories.sprintId, sprintId)).run();
        db.delete(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, sprintId)).run();
      }
    } else {
      const nextInfo = this.getNextSprintNumber(userId);
      const sprintNumber = customNumber || (data.sprintNumber != null ? String(data.sprintNumber).trim() : nextInfo.nextNumber);
      const name = customName || (data.name != null ? String(data.name).trim() : (data.sprintNumber ? `Sprint ${data.sprintNumber}` : nextInfo.nextName));
      const startDate = data.startDate ? String(data.startDate).trim() : formatDate(new Date());
      const durationDays = typeof data.durationDays === "number" && data.durationDays > 0 ? data.durationDays : 14;
      const calc = this.calculateSprintDates(userId, startDate, durationDays);
      const endDate = data.endDate ? String(data.endDate).trim() : calc.endDate;
      const showAndGrowDate = data.showAndGrowDate ? String(data.showAndGrowDate).trim() : calc.showAndGrowDate;
      const extendedDays = typeof data.extendedDays === "number" ? data.extendedDays : calc.extendedDays;
      const extensionReason = data.extensionReason !== undefined ? data.extensionReason : calc.extensionReason;
      const status = calculateSprintStatus(startDate, endDate);

      const created = db.insert(minorSprints).values({
        userId,
        sprintNumber,
        name,
        startDate,
        endDate,
        durationDays,
        showAndGrowDate,
        extendedDays,
        extensionReason,
        status,
      }).returning().get() as MinorSprint;

      sprintId = created.id;
      this.initSelfEvaluationsAndAssessments(sprintId);
    }

    if (Array.isArray(data.stories)) {
      data.stories.forEach((st: any, idx: number) => {
        if (!st || typeof st !== "object") return;
        const rawTitle = st.title ?? st.name ?? "";
        const title = String(rawTitle).trim();
        if (!title) return;

        const storyTypeCode = String(st.storyTypeCode ?? st.type ?? st.storyType ?? "US").trim().toUpperCase();
        const storyNumber = st.storyNumber != null ? String(st.storyNumber).trim() : undefined;
        const asA = st.asA ?? st.as_a ?? st.role;
        const iWant = st.iWant ?? st.i_want ?? st.want;
        const soThat = st.soThat ?? st.so_that ?? st.purpose;

        let learningOutcomes: number[] = [];
        const rawLUs = st.learningOutcomes ?? st.learning_outcomes ?? st.lus ?? st.lu;
        if (Array.isArray(rawLUs)) {
          learningOutcomes = rawLUs.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 5);
        } else if (typeof rawLUs === "number" || typeof rawLUs === "string") {
          const parsed = Number(rawLUs);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) learningOutcomes = [parsed];
        }

        const statusStr = String(st.status || "todo");
        const status = (["todo", "in_progress", "done"].includes(statusStr) ? statusStr : "todo") as "todo" | "in_progress" | "done";

        let acceptance: Array<{ text: string; isCompleted?: boolean; indent?: number }> = [];
        const rawAcceptance = st.acceptanceCriteria ?? st.acceptance_criteria;
        if (Array.isArray(rawAcceptance)) {
          acceptance = rawAcceptance
            .map((item: any) => {
              if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
              if (item && typeof item === "object") {
                const textVal = String(item.text ?? item.title ?? "").trim();
                return { text: textVal, isCompleted: Boolean(item.isCompleted), indent: item.indent ? 1 : 0 };
              }
              return null;
            })
            .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
        }

        let quality: Array<{ text: string; isCompleted?: boolean; indent?: number }> = [];
        const rawQuality = st.qualityCriteria ?? st.quality_criteria;
        if (Array.isArray(rawQuality)) {
          quality = rawQuality
            .map((item: any) => {
              if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
              if (item && typeof item === "object") {
                const textVal = String(item.text ?? item.title ?? "").trim();
                return { text: textVal, isCompleted: Boolean(item.isCompleted), indent: item.indent ? 1 : 0 };
              }
              return null;
            })
            .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
        }

        if (Array.isArray(st.criteria)) {
          st.criteria.forEach((c: any) => {
            if (!c || typeof c !== "object") return;
            const textVal = String(c.text ?? c.title ?? "").trim();
            if (!textVal) return;
            const critObj = { text: textVal, isCompleted: Boolean(c.isCompleted), indent: c.indent ? 1 : 0 };
            if (c.type === "quality") {
              quality.push(critObj);
            } else {
              acceptance.push(critObj);
            }
          });
        }

        let evidence: Array<{ type: "link" | "github" | "document" | "app"; title: string; url: string }> = [];
        const rawEvidence = st.evidence ?? st.evidenceList;
        if (Array.isArray(rawEvidence)) {
          evidence = rawEvidence
            .map((e: any) => {
              if (!e || typeof e !== "object") return null;
              const evTitle = String(e.title ?? "").trim();
              const evUrl = String(e.url ?? "").trim();
              const evTypeStr = String(e.type ?? "link");
              const evType = (["link", "github", "document", "app"].includes(evTypeStr) ? evTypeStr : "link") as "link" | "github" | "document" | "app";
              return { type: evType, title: evTitle, url: evUrl };
            })
            .filter((e): e is { type: "link" | "github" | "document" | "app"; title: string; url: string } => Boolean(e && e.title && e.url));
        }

        const orderIndex = typeof st.orderIndex === "number" ? st.orderIndex : idx + 1;
        const presentationData = st.presentationData && typeof st.presentationData === "object" ? st.presentationData : null;

        this.createStory(userId, sprintId, {
          storyTypeCode,
          storyNumber,
          title,
          asA: asA != null ? String(asA).trim() : undefined,
          iWant: iWant != null ? String(iWant).trim() : undefined,
          soThat: soThat != null ? String(soThat).trim() : undefined,
          learningOutcomes,
          status,
          orderIndex,
          presentationData,
          acceptanceCriteria: acceptance,
          qualityCriteria: quality,
          evidence,
        });
      });
    }

    if (Array.isArray(data.feedback)) {
      data.feedback.forEach((fb: any, idx: number) => {
        if (!fb || typeof fb !== "object") return;
        const fromWhom = String(fb.fromWhom ?? fb.from_whom ?? "").trim();
        const feedbackText = String(fb.feedback ?? "").trim();
        const actionText = String(fb.action ?? "").trim();
        if (!fromWhom || (!feedbackText && !actionText)) return;

        this.addFeedback(sprintId, {
          date: fb.date ? String(fb.date).trim() : formatDate(new Date()),
          fromWhom,
          feedback: feedbackText,
          action: actionText,
          orderIndex: typeof fb.orderIndex === "number" ? fb.orderIndex : idx + 1,
        });
      });
    }

    if (Array.isArray(data.selfEvaluations)) {
      const validEvals = data.selfEvaluations
        .filter((e: any) => e && typeof e.learningOutcome === "number" && e.learningOutcome >= 1 && e.learningOutcome <= 5)
        .map((e: any) => ({
          learningOutcome: e.learningOutcome,
          level: ["V", "NV", "-"].includes(e.level) ? e.level : "-",
          argumentation: e.argumentation ? String(e.argumentation) : "",
        }));
      if (validEvals.length > 0) {
        this.saveSelfEvaluations(sprintId, userId, validEvals);
      }
    }

    if (Array.isArray(data.teacherAssessments)) {
      const validAssess = data.teacherAssessments
        .filter((a: any) => a && typeof a.learningOutcome === "number" && a.learningOutcome >= 1 && a.learningOutcome <= 5)
        .map((a: any) => ({
          learningOutcome: a.learningOutcome,
          assessment: ["V", "O", "-"].includes(a.assessment) ? a.assessment : "-",
          notes: a.notes ? String(a.notes) : "",
          evaluatedAt: a.evaluatedAt ? String(a.evaluatedAt) : undefined,
        }));
      if (validAssess.length > 0) {
        this.saveTeacherAssessments(sprintId, userId, validAssess);
      }
    }

    if (data.reflection && typeof data.reflection === "object") {
      this.saveReflection(sprintId, {
        date: data.reflection.date ? String(data.reflection.date) : formatDate(new Date()),
        whatLearned: data.reflection.whatLearned ? String(data.reflection.whatLearned) : "",
        whatRetained: data.reflection.whatRetained ? String(data.reflection.whatRetained) : "",
        whatChange: data.reflection.whatChange ? String(data.reflection.whatChange) : "",
      });
    }

    return this.getSprintById(sprintId, userId)!;
  }

  autoGenerateSelfEvaluations(sprintId: number, userId: number): MinorSelfEvaluation[] {
    const sprint = this.getSprintById(sprintId, userId);
    if (!sprint) throw new Error("Sprint not found");

    const result: MinorSelfEvaluation[] = [];

    for (let lu = 1; lu <= 5; lu++) {
      const storiesForLu = sprint.stories.filter((s) => s.learningOutcomes.includes(lu));
      const hasStories = storiesForLu.length > 0;
      const defaultLevel = hasStories ? "V" : "-";

      const completedStories = storiesForLu.filter((s) => s.status === "done");
      const inProgressStories = storiesForLu.filter((s) => s.status !== "done");

      const lines: string[] = [];
      if (completedStories.length > 0) {
        lines.push(`Voltooide stories voor LU ${lu}:`);
        for (const st of completedStories) {
          const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
          lines.push(`• ${prefix}${st.title}`);
          if (st.evidence && st.evidence.length > 0) {
            for (const ev of st.evidence) {
              lines.push(`   - Bewijs (${ev.type}): ${ev.title} (${ev.url})`);
            }
          }
        }
      }

      if (inProgressStories.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(`In uitvoering:`);
        for (const st of inProgressStories) {
          const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
          lines.push(`• ${prefix}${st.title}`);
        }
      }

      if (lines.length === 0) {
        lines.push(`Geen stories gekoppeld aan LU ${lu} in deze sprint.`);
      }

      const generatedArgumentation = lines.join("\n");

      const existing = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu))).get();
      if (existing) {
        const updated = db.update(minorSelfEvaluations).set({
          level: defaultLevel,
          argumentation: generatedArgumentation,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(minorSelfEvaluations.id, existing.id)).returning().get();
        result.push(updated as MinorSelfEvaluation);
      } else {
        const created = db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: lu,
          level: defaultLevel,
          argumentation: generatedArgumentation,
        }).returning().get();
        result.push(created as MinorSelfEvaluation);
      }
    }

    return result;
  }
}
