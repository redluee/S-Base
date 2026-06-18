import { serverApi } from "@/lib/server-api";
import { redirect, notFound } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { RecipeForm } from "@/components/recipe-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/lib/lang";

export default async function EditRecipePage({
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
  const recipe = await serverApi.recipes.get(Number(id));
  if (!recipe) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in slide-in-from-top-2 duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]">
        <Link
          href={`/recipes/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
          {t("Back to recipe")}
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-6 sm:mb-8">
          {t("Edit Recipe")}
        </h1>
        <RecipeForm initial={recipe} />
      </main>
    </div>
  );
}
