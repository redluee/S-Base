import { serverApi } from "@/lib/server-api";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { WineForm } from "../../wine-form";

export default async function EditWinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {
    // Not authenticated
  }
  if (!user) redirect("/");

  const { id } = await params;
  let wine;
  try {
    wine = await serverApi.wines.get(Number(id));
  } catch {
    notFound();
  }

  if (!wine) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/recipes/wines"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-brand transition-colors mb-2 group"
            >
              <svg className="size-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>{t("Wines")}</span>
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2">
              <span>🍷</span>
              <span>{t("Edit Wine")}</span>
            </h1>
          </div>
        </div>

        <WineForm wine={wine} />
      </main>
    </div>
  );
}
