import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const role: "admin" | "user" =
    user.role ??
    (user.modules?.includes("pulse") || user.username === "admin"
      ? "admin"
      : "user");

  return (
    <DashboardClient
      user={{ ...user, role }}
      username={user.username}
      role={role}
      userModules={user.modules}
      isImpersonated={user.isImpersonated}
      impersonatedBy={user.impersonatedBy}
    />
  );
}
