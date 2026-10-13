import { request } from "./core";
import type {
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorStoryWithSprint,
  MinorStoryCriterion,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
  MinorVacation,
  MinorStoryType,
  MinorPeerHelp,
  MinorSettings,
  MinorDashboardStats,
  MinorStoryPresentationData,
  MinorSprintExportData,
} from "@backend/types/shared";

export const minorApi = {
  dashboard: () => request<MinorDashboardStats>("/minor/dashboard"),
  sprints: {
    list: () => request<MinorSprint[]>("/minor/sprints"),
    get: (id: number) => request<MinorSprintFull>(`/minor/sprints/${id}`),
    nextNumber: () => request<{ nextNumber: string; nextName: string }>("/minor/sprints/next-number"),
    calculateDates: (startDate: string, durationDays: number = 14) =>
      request<{
        startDate: string;
        endDate: string;
        durationDays: number;
        extendedDays: number;
        extensionReason: string | null;
        showAndGrowDate: string;
      }>(`/minor/sprints/calculate-dates?startDate=${encodeURIComponent(startDate)}&durationDays=${durationDays}`),
    create: (data: {
      sprintNumber?: string;
      name?: string;
      startDate: string;
      endDate?: string;
      durationDays?: number;
      showAndGrowDate?: string;
      status?: "planned" | "active" | "completed";
    }) => request<MinorSprint>("/minor/sprints", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{
      sprintNumber: string;
      name: string;
      startDate: string;
      endDate: string;
      durationDays: number;
      showAndGrowDate: string;
      extendedDays: number;
      extensionReason: string | null;
      status: "planned" | "active" | "completed";
    }>) => request<MinorSprint>(`/minor/sprints/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/minor/sprints/${id}`, { method: "DELETE" }),
    exportJson: (id: number) => request<MinorSprintExportData>(`/minor/sprints/${id}/export`),
    import: (
      data: unknown,
      targetSprintId?: number,
      options?: { overwrite?: boolean; customName?: string; customSprintNumber?: string }
    ) => {
      const payload =
        typeof data === "object" && data !== null
          ? { ...data, ...options }
          : data;
      return targetSprintId
        ? request<MinorSprintFull>(`/minor/sprints/${targetSprintId}/import`, {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : request<MinorSprintFull>("/minor/sprints/import", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    autoSelfEvaluations: (id: number) => request<MinorSelfEvaluation[]>(`/minor/sprints/${id}/self-evaluations/auto`, { method: "POST" }),
    saveSelfEvaluations: (id: number, evaluations: { learningOutcome: number; level: "V" | "NV" | "-"; argumentation?: string }[]) =>
      request<MinorSelfEvaluation[]>(`/minor/sprints/${id}/self-evaluations`, { method: "PUT", body: JSON.stringify({ evaluations }) }),
    saveTeacherAssessments: (id: number, assessments: { learningOutcome: number; assessment: "V" | "O" | "-"; notes?: string; evaluatedAt?: string }[]) =>
      request<MinorTeacherAssessment[]>(`/minor/sprints/${id}/teacher-assessments`, { method: "PUT", body: JSON.stringify({ assessments }) }),
    getReflection: (id: number) => request<MinorReflection>(`/minor/sprints/${id}/reflection`),
    saveReflection: (id: number, data: { date?: string; whatLearned?: string; whatRetained?: string; whatChange?: string }) =>
      request<MinorReflection>(`/minor/sprints/${id}/reflection`, { method: "PUT", body: JSON.stringify(data) }),
    feedback: {
      list: (sprintId: number) => request<MinorFeedbackEntry[]>(`/minor/sprints/${sprintId}/feedback`),
      create: (sprintId: number, data: { date: string; fromWhom: string; feedback: string; action: string; orderIndex?: number }) =>
        request<MinorFeedbackEntry>(`/minor/sprints/${sprintId}/feedback`, { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: { date?: string; fromWhom?: string; feedback?: string; action?: string; orderIndex?: number }) =>
        request<MinorFeedbackEntry>(`/minor/feedback/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/feedback/${id}`, { method: "DELETE" }),
    },
    stories: {
      listAll: () => request<MinorStoryWithSprint[]>("/minor/stories"),
      reorder: (sprintId: number, storyIds: number[]) =>
        request<{ success: boolean }>(`/minor/sprints/${sprintId}/stories/reorder`, {
          method: "PUT",
          body: JSON.stringify({ storyIds }),
        }),
      create: (sprintId: number | null | undefined, data: {
        storyTypeCode?: string;
        storyNumber?: string;
        title: string;
        asA?: string;
        iWant?: string;
        soThat?: string;
        learningOutcomes?: number[];
        status?: "todo" | "in_progress" | "done";
        orderIndex?: number;
        acceptanceCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
        qualityCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
        evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
        presentationData?: MinorStoryPresentationData | null;
      }) =>
        sprintId
          ? request<MinorStory>(`/minor/sprints/${sprintId}/stories`, { method: "POST", body: JSON.stringify(data) })
          : request<MinorStory>("/minor/stories", { method: "POST", body: JSON.stringify({ ...data, sprintId: null }) }),
      update: (id: number, data: {
        sprintId?: number | null;
        storyTypeCode?: string;
        storyNumber?: string;
        title?: string;
        asA?: string | null;
        iWant?: string | null;
        soThat?: string | null;
        learningOutcomes?: number[];
        status?: "todo" | "in_progress" | "done";
        orderIndex?: number;
        presentationData?: MinorStoryPresentationData | null;
        acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
        qualityCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
        evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
      }) => request<MinorStory>(`/minor/stories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => request<{ success: boolean }>(`/minor/stories/${id}`, { method: "DELETE" }),
      toggleCriterion: (criterionId: number, isCompleted: boolean) =>
        request<MinorStoryCriterion>(`/minor/criteria/${criterionId}/toggle`, { method: "PATCH", body: JSON.stringify({ isCompleted }) }),
    },
  },
  stories: {
    list: () => request<MinorStoryWithSprint[]>("/minor/stories"),
    reorder: (sprintId: number, storyIds: number[]) =>
      request<{ success: boolean }>(`/minor/sprints/${sprintId}/stories/reorder`, {
        method: "PUT",
        body: JSON.stringify({ storyIds }),
      }),
    create: (data: {
      sprintId?: number | null;
      storyTypeCode?: string;
      storyNumber?: string;
      title: string;
      asA?: string;
      iWant?: string;
      soThat?: string;
      learningOutcomes?: number[];
      status?: "todo" | "in_progress" | "done";
      orderIndex?: number;
      presentationData?: MinorStoryPresentationData | null;
      acceptanceCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
      qualityCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
      evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
    }) => request<MinorStory>("/minor/stories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: {
      sprintId?: number | null;
      storyTypeCode?: string;
      storyNumber?: string;
      title?: string;
      asA?: string | null;
      iWant?: string | null;
      soThat?: string | null;
      learningOutcomes?: number[];
      status?: "todo" | "in_progress" | "done";
      orderIndex?: number;
      presentationData?: MinorStoryPresentationData | null;
      acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
      qualityCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
      evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
    }) => request<MinorStory>(`/minor/stories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/minor/stories/${id}`, { method: "DELETE" }),
    toggleCriterion: (criterionId: number, isCompleted: boolean) =>
      request<MinorStoryCriterion>(`/minor/criteria/${criterionId}/toggle`, { method: "PATCH", body: JSON.stringify({ isCompleted }) }),
  },
  vacations: {
    list: () => request<MinorVacation[]>("/minor/vacations"),
    create: (data: { name: string; startDate: string; endDate: string }) =>
      request<MinorVacation>("/minor/vacations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; startDate?: string; endDate?: string }) =>
      request<MinorVacation>(`/minor/vacations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/minor/vacations/${id}`, { method: "DELETE" }),
  },
  storyTypes: {
    list: () => request<MinorStoryType[]>("/minor/story-types"),
    create: (data: { code: string; name: string; description?: string; color?: string; defaultQualityCriteria?: ({ text: string; indent?: number } | string)[] }) =>
      request<MinorStoryType>("/minor/story-types", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { code?: string; name?: string; description?: string; color?: string; defaultQualityCriteria?: ({ text: string; indent?: number } | string)[] }) =>
      request<MinorStoryType>(`/minor/story-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/minor/story-types/${id}`, { method: "DELETE" }),
  },
  peerHelp: {
    list: () => request<MinorPeerHelp[]>("/minor/peer-help"),
    create: (data: { sprintId?: number | null; date: string; peerName: string; description: string; links?: string }) =>
      request<MinorPeerHelp>("/minor/peer-help", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { sprintId?: number | null; date?: string; peerName?: string; description?: string; links?: string }) =>
      request<MinorPeerHelp>(`/minor/peer-help/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/minor/peer-help/${id}`, { method: "DELETE" }),
  },
  settings: {
    get: () => request<MinorSettings>("/minor/settings"),
    update: (data: { portfolioUrl?: string | null; lastName?: string | null }) =>
      request<MinorSettings>("/minor/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/minor/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      throw new Error("Upload failed");
    }
    return res.json() as Promise<{ filePath: string; originalName: string }>;
  },
};
