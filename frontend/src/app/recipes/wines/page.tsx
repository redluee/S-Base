import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import type { Wine } from "@/lib/api";
import { WineCard } from "./wine-card";

const wineTypes = ["", "red", "white", "rose", "sparkling", "dessert"] as const;

const sortFields = [
  { key: "brand", label: t("Brand / Winery") },
  { key: "rating", label: t("Rating") },
  { key: "vintage", label: t("Vintage / Year") },
] as const;

export default async function WinesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sortBy?: string; sortOrder?: string; q?: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {
    // Not authenticated
  }
  if (!user) redirect("/");

  const { type, sortBy, sortOrder, q } = await searchParams;
  const wines = await serverApi.wines.list(type, q, sortBy, sortOrder);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/recipes"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-brand transition-colors mb-2 group"
            >
              <svg className="size-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>{t("Recipes")}</span>
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2.5">
              <span>🍷</span>
              <span>{t("Wines")}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/recipes/wines/new">
              <Button className="bg-brand text-zinc-900 hover:bg-brand-hover active:scale-[0.97] transition-all text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4">
                <svg className="size-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t("New Wine")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Wine type filters */}
        <div className="flex gap-1.5 overflow-x-auto flex-nowrap sm:flex-wrap -mx-4 sm:mx-0 px-4 sm:px-0 mb-4 [&::-webkit-scrollbar]:hidden">
          {wineTypes.map((wt) => {
            const params = new URLSearchParams();
            if (wt) params.set("type", wt);
            if (sortBy) params.set("sortBy", sortBy);
            if (sortOrder) params.set("sortOrder", sortOrder);
            if (q) params.set("q", q);
            return (
              <Link key={wt} href={`/recipes/wines${params.toString() ? `?${params.toString()}` : ""}`}>
                <Badge
                  variant="outline"
                  className={`shrink-0 cursor-pointer transition-all text-xs sm:text-sm px-3 py-1.5 ${
                    (type ?? "") === wt
                      ? "bg-brand text-zinc-900 border-brand font-medium shadow-sm"
                      : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {wt ? t(wt) : t("All")}
                </Badge>
              </Link>
            );
          })}
        </div>

        {/* Sort fields */}
        <div className="flex items-center gap-1.5 mb-6">
          {sortFields.map((field) => {
            const isActive = sortBy === field.key || (!sortBy && field.key === "brand");
            const nextOrder = isActive && sortOrder !== "desc" ? "desc" : "asc";
            const params = new URLSearchParams();
            if (type) params.set("type", type);
            if (q) params.set("q", q);
            params.set("sortBy", field.key);
            params.set("sortOrder", nextOrder);
            return (
              <Link
                key={field.key}
                href={`/recipes/wines?${params.toString()}`}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand ring-1 ring-brand/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {field.label}
                {isActive && (
                  <span className="text-base leading-none">
                    {sortOrder === "desc" ? "\u2193" : "\u2191"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {wines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center rounded-2xl border border-dashed border-border/60 bg-card/40 px-4">
            <Link
              href="/recipes/wines/new"
              className="group size-14 sm:size-16 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 flex items-center justify-center mb-4 transition-all active:scale-[0.95] ring-1 ring-white/10"
            >
              <span className="text-2xl sm:text-3xl">🍷</span>
            </Link>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-sm">
              {q
                ? t('No recipes found for "{q}".', { q })
                : type
                  ? t('No recipes with status "{status}".', { status: t(type) })
                  : t("No wines yet.")}
            </p>
            <Link href="/recipes/wines/new">
              <Button className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm px-4 py-2">
                {t("Add your first wine")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wines.map((wine: Wine) => (
              <WineCard key={wine.wineId} wine={wine} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
