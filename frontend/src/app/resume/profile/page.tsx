import { serverApi } from "@/lib/server-api";
import { t } from "@/lib/lang";
import { ResumeProfileClient } from "./client";

export default async function ResumeProfilePage() {
  const profile = await serverApi.resume.profile().catch(() => null);
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <p role="alert" className="text-sm text-red-400">{t("Profiel laden mislukt. Probeer het opnieuw.")}</p>
      </div>
    );
  }
  return <ResumeProfileClient initialProfile={profile} />;
}
