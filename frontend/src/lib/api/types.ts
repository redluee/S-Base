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

export interface MeasurementPhoto {
  photoId: number;
  measurementId: number;
  filePath: string;
  createdAt: string;
}

export interface Measurement {
  measurementId: number;
  userId: number;
  date: string;
  height: number | null;
  weight: number | null;
  bodyFat: number | null;
  skeletalMuscle: number | null;
  fatMass: number | null;
  waist?: number | null;
  chest?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  shoulders?: number | null;
  neck?: number | null;
  calves?: number | null;
  createdAt: string;
  photos: MeasurementPhoto[];
}

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  role?: "admin" | "user";
  modules?: string[];
  isImpersonated?: boolean;
  impersonatorUserId?: number | null;
  impersonatedBy?: string | null;
}

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

export interface Wine {
  wineId: number;
  userId: number;
  brand: string;
  type: "red" | "white" | "rose" | "sparkling" | "dessert";
  variety: string;
  vintage: number | null;
  countryRegion: string | null;
  purchaseLocation: string | null;
  rating: number | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface CashflowTradeName {
  id: number;
  userId: number;
  displayName: string;
  address: string | null;
  iban: string | null;
  kvkNumber: string | null;
  vatNumber: string | null;
  createdAt: string;
}

export interface CashflowClient {
  id: number;
  userId: number;
  name: string;
  address: string | null;
  email: string | null;
  kvkNumber: string | null;
  standardRate: number | null;
  contractPdfPath?: string | null;
  contractPdfName?: string | null;
  createdAt: string;
}

export interface CashflowProject {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientEmail: string | null;
  tradeNameId: number | null;
  tradeNameDisplay: string | null;
  invoiceCount: number;
  totalBilled: number;
}

export interface CashflowProjectDetail {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  clientKvk: string | null;
  standardRate: number | null;
  tradeNameId: number | null;
  tradeNameDisplay: string | null;
  tradeNameAddress: string | null;
  tradeNameIban: string | null;
  tradeNameKvk: string | null;
}

export interface CashflowInvoiceLine {
  id: number;
  invoiceId: number;
  date?: number | null;
  taskDescription: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  type: "hours" | "service" | "travel_costs" | "discount";
  discountType: "percentage" | "amount" | null;
  discountValue: number | null;
}

export interface CashflowInvoiceSummary {
  id: number;
  invoiceNumber: string;
  name?: string | null;
  status: "draft" | "sent" | "paid" | "overdue";
  dateCreated: number | null;
  dateService: number | null;
  paymentDueDate: number | null;
  datePaid?: number | null;
  isKor: boolean;
  projectId: number | null;
  projectName: string | null;
  clientId: number;
  clientName: string;
  tradeNameDisplay: string | null;
  total: number;
  createdAt: string;
}

export interface CashflowInvoiceFull extends CashflowInvoiceSummary {
  projectLocation: string | null;
  clientAddress: string | null;
  clientEmail: string | null;
  clientKvk: string | null;
  tradeNameId: number | null;
  tradeNameAddress: string | null;
  tradeNameIban: string | null;
  tradeNameKvk: string | null;
  tradeNameVat: string | null;
  lines: CashflowInvoiceLine[];
  total: number;
  createdAt: string;
}

export interface CashflowExpense {
  id: number;
  userId: number;
  description: string;
  category: string | null;
  amount: number;
  date: number | null;
  tradeNameId: number | null;
  tradeNameDisplay: string | null;
  receiptPdfPath: string | null;
  receiptPdfName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CashflowMonthlyExpense {
  month: string;
  total: number;
  count: number;
}

export interface CashflowExpenseCategory {
  category: string;
  total: number;
  count: number;
}

export interface CashflowMonthlyIncome {
  month: string;
  total: number;
  paid: number;
  expected: number;
  draft?: number;
  open?: number;
}

export interface CashflowDashboardStats {
  monthlyIncome: CashflowMonthlyIncome[];
  statusTotals: { status: string; count: number; total: number }[];
  totalPaid12m: number;
  totalExpected12m?: number;
  monthlyExpenses?: CashflowMonthlyExpense[];
  expensesByCategory?: CashflowExpenseCategory[];
  totalExpenses12m?: number;
  netProfit12m?: number;
  firstRecordYear?: number;
}


