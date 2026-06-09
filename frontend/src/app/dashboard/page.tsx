import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {
    // Not authenticated
  }
  if (!user) redirect("/");

  return <DashboardClient username={user.username} />;
}
