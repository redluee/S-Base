export interface McServer {
  serverId: number;
  slug: string;
  displayName: string;
  engine: "vanilla" | "fabric";
  mcVersion: string;
  serverDir: string;
  javaArgs: string | null;
  templateId: number | null;
  createdAt: string;
  hasMap?: boolean;
  online?: boolean;
}

export interface McServerStatus {
  online: boolean;
  playerCount: number;
}

export interface McTemplate {
  templateId: number;
  name: string;
  engine: string;
  mcVersion: string;
  javaArgs: string | null;
  propertiesJson: string | null;
  notes: string | null;
  createdAt: string;
}

export interface McPlayerStat {
  statId: number;
  serverId: number;
  playerUuid: string;
  playerName: string;
  firstSeen: string;
  lastSeen: string | null;
  totalPlaytime: number;
}

export interface McBannedPlayer {
  uuid: string;
  name: string;
  created?: string;
  source?: string;
  expires?: string;
  reason?: string;
}

export interface McServerInspection {
  isValid: boolean;
  serverDir: string;
  folderName: string;
  hasProperties: boolean;
  hasWorld: boolean;
  hasEula: boolean;
  eulaAccepted: boolean;
  hasJar: boolean;
  jarFiles: string[];
  detectedEngine: "vanilla" | "fabric";
  detectedVersion?: string;
  detectedDisplayName?: string;
  properties: Record<string, string>;
  error?: string;
}

export interface McUnregisteredServerScan {
  serverDir: string;
  folderName: string;
  suggestedSlug: string;
  inspection: McServerInspection;
}

export type { AuthUser } from "@backend/auth";

export type {
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorStoryWithSprint,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
  MinorVacation,
  MinorStoryType,
  MinorDefaultQualityCriterion,
  MinorPeerHelp,
  MinorSettings,
  MinorDashboardStats,
  MinorStoryPresentationData,
  MinorStoryPresentationImage,
  MinorStoryPresentationLink,
  MinorStoryPresentationDocument,
  MinorSprintExportData,
  MinorSprintExportStory,
} from "@backend/types/shared";

export interface PulseUser {
  userId: number;
  username: string;
  email: string | null;
  isPaused: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  modules: string[];
  mcServers?: string[];
}

export interface PulseModuleInfo {
  moduleId: number;
  moduleName: string;
  moduleAlias: string | null;
  description: string | null;
}

export interface PulseStats {
  totalUsers: number;
  activeUsers: number;
  pausedUsers: number;
  totalPermissions: number;
}

export interface ShutdownSchedule {
  enabled: boolean;
  time: string;
  blockedUntil: string | null;
  isBlocked: boolean;
  nextShutdownAt: string | null;
  minutesUntilShutdown: number | null;
}

export type UpdatePhase =
  | "starting"
  | "repositories"
  | "resolving"
  | "downloading"
  | "installing"
  | "cleanup"
  | "verifying"
  | "complete"
  | "nothing"
  | "error";

export interface SystemUpdateState {
  status: "idle" | "running" | "success" | "failed";
  phase: UpdatePhase | null;
  progress: { current: number; total: number } | null;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  log: string[];
  error: string | null;
}

export type {
  CashflowClient,
  CashflowDashboardStats,
  CashflowExpense,
  CashflowInvoiceFull,
  CashflowInvoiceLine,
  CashflowInvoiceSummary,
  CashflowProject,
  CashflowProjectDetail,
  CashflowTradeName,
} from "@backend/types/cashflow";

export type { Measurement, MeasurementPhoto, Wine } from "@backend/types/recipes";
