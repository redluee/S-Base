import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { ResumeSubnav } from "./subnav";

export default async function ResumeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.modules?.includes("resume")) redirect("/dashboard");

  return (
    <>
      <NavHeader username={user.username} />
      <ResumeSubnav />
      <main id="main-content" className="flex-1">{children}</main>
    </>
  );
}
