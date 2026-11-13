import { serverApi } from "@/lib/server-api";
import { ResumeListClient } from "./client";

export default async function ResumePage() {
  const [resumes, experiences, educations] = await Promise.all([
    serverApi.resume.resumes.list(),
    serverApi.resume.experiences.list(),
    serverApi.resume.educations.list(),
  ]);
  return <ResumeListClient initialResumes={resumes} libraryCount={experiences.length + educations.length} />;
}
