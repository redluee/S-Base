import { serverApi } from "@/lib/server-api";
import { ResumeLibraryClient } from "../library";

export default async function ResumeEducationPage() {
  const items = await serverApi.resume.educations().catch(() => []);
  return <ResumeLibraryClient kind="education" initialItems={items} />;
}
