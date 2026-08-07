import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { CashflowSubnav } from "./subnav";

export default async function CashflowLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full flex flex-col">
      <NavHeader username={user.username} />
      <CashflowSubnav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
