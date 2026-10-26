import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { FinanceClient } from "../client";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return (
    <>
      <NavHeader username={user.username} />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {user.modules?.includes("finance") ? (
          <FinanceClient />
        ) : (
          <p role="alert">{t("finance.forbidden")}</p>
        )}
      </main>
    </>
  );
}
