import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardClient
      username={user.username}
      userModules={user.modules}
      isImpersonated={user.isImpersonated}
      impersonatedBy={user.impersonatedBy}
    />
  );
}
