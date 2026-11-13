import { RecipeForm } from "../recipe-form";
import { t } from "@/lib/lang";

export default async function NewRecipePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in slide-in-from-top-2 duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]">
        <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-6 sm:mb-8">
          {t("New Recipe")}
        </h1>
        <RecipeForm />
      </div>
  );
}
