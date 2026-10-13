import { request, uploadFormDataWithProgress } from "./core";
import type {
  ResumeProfile,
  ResumeExperience,
  ResumeEducation,
  Resume,
  ResumeFull,
  ResumeItemInput,
  ResumeGoogleFont,
} from "@backend/types/shared";

export const resumeApi = {
  profile: {
    get: () => request<ResumeProfile>("/resume/profile"),
    update: (data: Partial<ResumeProfile>) =>
      request<ResumeProfile>("/resume/profile", { method: "PUT", body: JSON.stringify(data) }),
    uploadPhoto: (file: File | Blob, onProgress?: (progress: number) => void) =>
      uploadFormDataWithProgress<ResumeProfile>("/api/resume/profile/photo", file, "photo.jpg", onProgress),
    deletePhoto: () => request<ResumeProfile>("/resume/profile/photo", { method: "DELETE" }),
  },
  experiences: {
    list: () => request<ResumeExperience[]>("/resume/experiences"),
    create: (data: Partial<ResumeExperience>) =>
      request<ResumeExperience>("/resume/experiences", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<ResumeExperience>) =>
      request<ResumeExperience>(`/resume/experiences/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/resume/experiences/${id}`, { method: "DELETE" }),
  },
  educations: {
    list: () => request<ResumeEducation[]>("/resume/educations"),
    create: (data: Partial<ResumeEducation>) =>
      request<ResumeEducation>("/resume/educations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<ResumeEducation>) =>
      request<ResumeEducation>(`/resume/educations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/resume/educations/${id}`, { method: "DELETE" }),
  },
  resumes: {
    list: () => request<Resume[]>("/resume/resumes"),
    create: (data: Partial<Resume> & { selectAll?: boolean }) =>
      request<Resume>("/resume/resumes", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number) => request<ResumeFull>(`/resume/resumes/${id}`),
    update: (id: number, data: Partial<Resume>) =>
      request<Resume>(`/resume/resumes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/resume/resumes/${id}`, { method: "DELETE" }),
    duplicate: (id: number) => request<Resume>(`/resume/resumes/${id}/duplicate`, { method: "POST" }),
    setItems: (id: number, items: ResumeItemInput[]) =>
      request<ResumeItemInput[]>(`/resume/resumes/${id}/items`, { method: "PUT", body: JSON.stringify({ items }) }),
  },
  fonts: {
    google: (family: string) =>
      request<ResumeGoogleFont>(`/resume/fonts/google?family=${encodeURIComponent(family)}`),
  },
};
