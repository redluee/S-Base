import { serverApi } from "@/lib/server-api";
import { ResumeLibraryClient } from "../library";

export default async function ResumeExperiencePage() {
  const items = await serverApi.resume.experiences.list();
  return <ResumeLibraryClient kind="experience" initialItems={items} />;
}
