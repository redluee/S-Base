import { serverApi } from "@/lib/server-api";
import { ResumeListClient } from "./client";

export default async function ResumePage() {
  const [resumes, experiences, educations] = await Promise.all([
    serverApi.resume.resumes.list().catch(() => []),
    serverApi.resume.experiences.list().catch(() => []),
    serverApi.resume.educations.list().catch(() => []),
  ]);
  return <ResumeListClient initialResumes={resumes} libraryCount={experiences.length + educations.length} />;
}
