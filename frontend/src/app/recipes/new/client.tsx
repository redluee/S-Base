"use client";

import { useState } from "react";
import type { RecipeDraft } from "@backend/types/recipes";
import { RecipeAiImport } from "../recipe-ai-import";
import { RecipeForm } from "../recipe-form";

export function NewRecipeClient() {
  const [draft, setDraft] = useState<{ version: number; recipe?: RecipeDraft }>({ version: 0 });

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <RecipeAiImport onDraft={(recipe) => setDraft((prev) => ({ version: prev.version + 1, recipe }))} />
      <RecipeForm key={draft.version} draft={draft.recipe} />
    </div>
  );
}
