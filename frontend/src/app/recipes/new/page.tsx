import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { RecipeForm } from "@/components/recipe-form";
import { t } from "@/lib/lang";

export default async function NewRecipePage() {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {
    // Not authenticated
  }
  if (!user) redirect("/");

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in slide-in-from-top-2 duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]">
        <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-6 sm:mb-8">
          {t("New Recipe")}
        </h1>
        <RecipeForm />
      </main>
    </div>
  );
}
