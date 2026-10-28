import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";
import { NavHeader } from "@/components/nav-header";
import { FinanceClient } from "./client";
import { t } from "@/lib/lang";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return (
    <div className="min-h-full flex flex-col">
      <NavHeader username={user.username} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {user.modules?.includes("finance") ? (
          <FinanceClient />
        ) : (
          <p role="alert">{t("finance.forbidden")}</p>
        )}
      </main>
    </div>
  );
}
