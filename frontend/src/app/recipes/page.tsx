import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/kitchens";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";

const statusColors: Record<string, string> = {
  "to try": "bg-muted text-black",
  success: "bg-brand/20 text-brand",
  "needs tweak": "bg-amber-900/30 text-amber-400",
  failure: "bg-destructive/10 text-destructive",
  archived: "bg-zinc-800 text-zinc-400",
};

const sortFields = [
  { key: "name", label: t("Name") },
  { key: "rating", label: t("Rating") },
  { key: "cookingTime", label: t("Time") },
] as const;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sortBy?: string; sortOrder?: string; q?: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {
    // Not authenticated
  }
  if (!user) redirect("/");

  const { status, sortBy, sortOrder, q } = await searchParams;
  const recipes = await serverApi.recipes.list(status, sortBy, sortOrder, q);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("Taste tracker")}
          </h1>
          <Link href="/recipes/new">
            <Button className="bg-brand text-zinc-900 hover:bg-brand-hover active:scale-[0.97] transition-all text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4">
              <svg className="size-4 sm:size-5 mr-1 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("New Recipe")}
            </Button>
          </Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto flex-nowrap sm:flex-wrap -mx-4 sm:mx-0 px-4 sm:px-0 mb-4 [&::-webkit-scrollbar]:hidden">
          {["", "to try", "success", "needs tweak", "failure", "archived"].map((s) => {
            const params = new URLSearchParams();
            if (s) params.set("status", s);
            if (sortBy) params.set("sortBy", sortBy);
            if (sortOrder) params.set("sortOrder", sortOrder);
            if (q) params.set("q", q);
            return (
              <Link key={s} href={`/recipes${params.toString() ? `?${params.toString()}` : ""}`}>
                <Badge
                  variant="outline"
                  className={`shrink-0 cursor-pointer transition-colors text-xs sm:text-sm px-2.5 sm:px-3 py-1 ${
                    (status ?? "") === s
                      ? "bg-brand text-zinc-900 border-brand"
                      : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  {s ? t(s) : t("All")}
                </Badge>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 mb-5">
          {sortFields.map((field) => {
            const isActive = sortBy === field.key || (!sortBy && field.key === "name");
            const nextOrder = isActive && sortOrder !== "desc" ? "desc" : "asc";
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (q) params.set("q", q);
            params.set("sortBy", field.key);
            params.set("sortOrder", nextOrder);
            return (
              <Link
                key={field.key}
                href={`/recipes?${params.toString()}`}
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

        {q && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>
              {t('Search results for "{q}"', { q })}
            </span>
            <a
              href={`/recipes?${new URLSearchParams(
                Object.fromEntries(
                  Object.entries({ status, sortBy, sortOrder }).filter(([_, v]) => v !== undefined),
                ) as Record<string, string>,
              ).toString()}`}
              className="text-xs text-brand hover:text-brand-hover underline"
            >
              {t("Clear")}
            </a>
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
            <div className="size-12 sm:size-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="size-6 sm:size-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {q
                ? t('No recipes found for "{q}".', { q })
                : status
                  ? t('No recipes with status "{status}".', { status: t(status) })
                  : t("No recipes yet.")}
            </p>
            {q ? (
              <a
                href={`/recipes?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries({ status, sortBy, sortOrder }).filter(([_, v]) => v !== undefined),
                  ) as Record<string, string>,
                ).toString()}`}
                className="text-sm text-brand hover:text-brand-hover underline"
              >
                {t("Clear search")}
              </a>
            ) : (
              <Link href="/recipes/new">
                <Button className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm">
                  {t("Create your first recipe")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recipes.map((recipe: any) => (
              <Link
                key={recipe.recipeId}
                href={`/recipes/${recipe.recipeId}`}
                className="group block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium text-foreground text-sm sm:text-base truncate">
                        {recipe.name}
                      </h2>
                      {recipe.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] sm:text-xs ${statusColors[recipe.status] ?? "border-border text-muted-foreground"}`}
                    >
                      {t(recipe.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3 mt-2 text-xs sm:text-sm text-muted-foreground">
                    {recipe.rating != null && (
                      <span className="inline-flex items-center gap-1 text-brand">
                        <svg className="size-3 sm:size-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {recipe.rating}/10
                      </span>
                    )}
                    {recipe.cookingTime && (
                      <span className="inline-flex items-center gap-1">
                        <svg className="size-3 sm:size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {recipe.cookingTime} min
                      </span>
                    )}
                    {recipe.kitchen && (
                      <span className="text-base sm:text-lg leading-none">{getFlag(recipe.kitchen)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
