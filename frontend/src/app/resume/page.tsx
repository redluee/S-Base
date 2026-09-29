import { serverApi } from "@/lib/server-api";
import { ResumeListClient } from "./client";

export default async function ResumePage() {
  const [resumes, experiences, educations] = await Promise.all([
    serverApi.resume.resumes.list().catch(() => []),
    serverApi.resume.experiences().catch(() => []),
    serverApi.resume.educations().catch(() => []),
  ]);
  return <ResumeListClient initialResumes={resumes} libraryCount={experiences.length + educations.length} />;
}
