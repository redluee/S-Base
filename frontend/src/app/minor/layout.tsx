import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { MinorSubnav } from "./subnav";

export default async function MinorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full flex flex-col bg-black text-foreground">
      <NavHeader username={user.username} />
      <MinorSubnav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
