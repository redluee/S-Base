import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ResumeEditorClient } from "./client";

export default async function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resumeId = Number(id);
  if (!Number.isInteger(resumeId)) notFound();

  const [full, experiences, educations] = await Promise.all([
    serverApi.resume.resumes.get(resumeId).catch(() => null),
    serverApi.resume.experiences().catch(() => []),
    serverApi.resume.educations().catch(() => []),
  ]);
  if (!full) notFound();

  return <ResumeEditorClient initial={full} experiences={experiences} educations={educations} />;
}
