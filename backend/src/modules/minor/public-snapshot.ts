import { createHash, timingSafeEqual } from "crypto";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { users } from "../../db/schema";
import type { MinorService } from "./index";
import type { MinorStoryPresentationData } from "../../types/shared";

export const SNAPSHOT_VERSION = 1;
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const ASSET_NAME_PATTERN = /^minor_[0-9a-f-]+\.[a-z0-9]+$/i;

const UPLOAD_URL_PATTERN = /(?:https?:\/\/[^\s"'<>]+)?\/api\/uploads\/(minor_[0-9a-f-]+\.[a-z0-9]+)/gi;

export const defaultUploadsDir = join(import.meta.dir, "../../../uploads");

export interface PublicSnapshotCriterion {
  text: string;
  isCompleted: boolean;
  indent: number;
}

export interface PublicSnapshotStory {
  storyTypeCode: string;
  storyNumber: string | null;
  title: string;
  asA: string | null;
  iWant: string | null;
  soThat: string | null;
  learningOutcomes: number[];
  status: "todo" | "in_progress" | "done";
  orderIndex: number;
  presentationData: Omit<MinorStoryPresentationData, "notes"> | null;
  acceptanceCriteria: PublicSnapshotCriterion[];
  qualityCriteria: PublicSnapshotCriterion[];
  evidence: Array<{ type: "link" | "github" | "document" | "app"; title: string; url: string }>;
}

export interface PublicSnapshotSprint {
  sprintNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  showAndGrowDate: string;
  extendedDays: number;
  extensionReason: string | null;
  status: "planned" | "active" | "completed";
  stories: PublicSnapshotStory[];
  selfEvaluations: Array<{ learningOutcome: number; level: "V" | "NV" | "-"; argumentation: string | null }>;
  teacherAssessments: Array<{ learningOutcome: number; assessment: "V" | "O" | "-"; notes: string | null; evaluatedAt: string | null }>;
  reflection: { date: string; whatLearned: string | null; whatRetained: string | null; whatChange: string | null } | null;
  feedback: Array<{ date: string; feedback: string; action: string }>;
}

export interface PublicSnapshotAsset {
  path: string;
  sha256: string;
  size: number;
}

export interface PublicSnapshot {
  version: number;
  generatedAt: string;
  contentHash: string;
  sprints: PublicSnapshotSprint[];
  peerHelp: Array<{ date: string; sprintNumber: string | null; description: string; links: string | null }>;
  vacations: Array<{ name: string; startDate: string; endDate: string }>;
  assets: PublicSnapshotAsset[];
}

function rewriteUploadUrls<T>(value: T, found: Set<string>): T {
  if (typeof value === "string") {
    return value.replace(UPLOAD_URL_PATTERN, (_match, file: string) => {
      found.add(file);
      return `/minor/${file}`;
    }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteUploadUrls(item, found)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = rewriteUploadUrls(item, found);
    }
    return out as T;
  }
  return value;
}

function isPublished(sprint: { selfEvaluations?: Array<{ level: string; argumentation: string | null }> }) {
  return (sprint.selfEvaluations || []).some((se) => se.level !== "-" || (se.argumentation || "").trim() !== "");
}

function describeAsset(file: string, uploadsDir: string): PublicSnapshotAsset | null {
  try {
    const fullPath = join(uploadsDir, file);
    const size = statSync(fullPath).size;
    if (size > MAX_ASSET_BYTES) {
      console.warn(`Snapshot asset skipped (too large): ${file}`);
      return null;
    }
    const sha256 = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
    return { path: `public/minor/${file}`, sha256, size };
  } catch {
    console.warn(`Snapshot asset skipped (missing): ${file}`);
    return null;
  }
}

export function resolvePublishUserId(): number | null {
  const username = process.env.MINOR_PUBLISH_USERNAME;
  if (!username) return null;
  const row = db.select({ userId: users.userId }).from(users).where(eq(users.username, username)).get();
  return row?.userId ?? null;
}

export function buildPublicSnapshot(minor: MinorService, userId: number, uploadsDir: string = defaultUploadsDir): PublicSnapshot {
  const found = new Set<string>();

  const sprintRows = minor
    .listSprints(userId)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id);

  const publishedNumbers = new Map<number, string>();
  const sprints: PublicSnapshotSprint[] = [];

  for (const row of sprintRows) {
    const full = minor.getSprintById(row.id, userId);
    if (!full || !isPublished(full)) continue;
    publishedNumbers.set(full.id, full.sprintNumber);

    const stories: PublicSnapshotStory[] = (full.stories || []).map((s) => {
      const { notes: _notes, ...presentation } = s.presentationData || {};
      return {
        storyTypeCode: s.storyTypeCode,
        storyNumber: s.storyNumber,
        title: s.title,
        asA: s.asA,
        iWant: s.iWant,
        soThat: s.soThat,
        learningOutcomes: s.learningOutcomes,
        status: s.status,
        orderIndex: s.orderIndex,
        presentationData: s.presentationData ? rewriteUploadUrls(presentation, found) : null,
        acceptanceCriteria: (s.criteria || [])
          .filter((c) => c.type === "acceptance")
          .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent ?? 0 })),
        qualityCriteria: (s.criteria || [])
          .filter((c) => c.type === "quality")
          .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent ?? 0 })),
        evidence: (s.evidence || []).map((e) => ({
          type: e.type,
          title: e.title,
          url: rewriteUploadUrls(e.url, found),
        })),
      };
    });

    sprints.push({
      sprintNumber: full.sprintNumber,
      name: full.name,
      startDate: full.startDate,
      endDate: full.endDate,
      durationDays: full.durationDays,
      showAndGrowDate: full.showAndGrowDate,
      extendedDays: full.extendedDays,
      extensionReason: full.extensionReason,
      status: full.status,
      stories,
      selfEvaluations: (full.selfEvaluations || []).map((se) => ({
        learningOutcome: se.learningOutcome,
        level: se.level,
        argumentation: se.argumentation || null,
      })),
      teacherAssessments: (full.teacherAssessments || []).map((ta) => ({
        learningOutcome: ta.learningOutcome,
        assessment: ta.assessment,
        notes: ta.notes || null,
        evaluatedAt: ta.evaluatedAt || null,
      })),
      reflection: full.reflection
        ? {
            date: full.reflection.date,
            whatLearned: full.reflection.whatLearned || null,
            whatRetained: full.reflection.whatRetained || null,
            whatChange: full.reflection.whatChange || null,
          }
        : null,
      feedback: (full.feedback || []).map((f) => ({
        date: f.date,
        feedback: rewriteUploadUrls(f.feedback, found),
        action: rewriteUploadUrls(f.action, found),
      })),
    });
  }

  const peerHelp = minor
    .listPeerHelp(userId)
    .filter((p) => p.sprintId === null || publishedNumbers.has(p.sprintId))
    .map((p) => ({
      date: p.date,
      sprintNumber: p.sprintId === null ? null : publishedNumbers.get(p.sprintId) ?? null,
      description: rewriteUploadUrls(p.description, found),
      links: p.links ? rewriteUploadUrls(p.links, found) : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const vacations = minor.listVacations(userId).map((v) => ({
    name: v.name,
    startDate: v.startDate,
    endDate: v.endDate,
  }));

  const assets = [...found]
    .sort()
    .map((file) => describeAsset(file, uploadsDir))
    .filter((a): a is PublicSnapshotAsset => a !== null);

  const hashable = { version: SNAPSHOT_VERSION, sprints, peerHelp, vacations, assets };
  const contentHash = createHash("sha256").update(JSON.stringify(hashable)).digest("hex");

  return {
    version: SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    contentHash,
    sprints,
    peerHelp,
    vacations,
    assets,
  };
}

export function bearerTokenCheck(request: Request, envName: string): Response | null {
  const expected = process.env[envName];
  if (!expected) {
    return new Response(JSON.stringify({ error: "Not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
