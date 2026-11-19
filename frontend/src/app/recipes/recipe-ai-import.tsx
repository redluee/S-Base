"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { RECIPE_IMPORT_MAX_LENGTH } from "@backend/shared/recipes";
import type { RecipeDraft } from "@backend/types/recipes";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/core";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Textarea } from "@/components/ui/textarea";

export function RecipeAiImport({ onDraft }: { onDraft: (draft: RecipeDraft) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      onDraft(await api.recipes.importText(text));
      setDone(true);
      setText("");
    } catch (err) {
      setError(apiErrorMessage(err, "Generating the recipe failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Check className="size-4 text-brand" />
          {t("Recipe filled in. Check it and save.")}
        </p>
        <Button type="button" variant="ghost" onClick={() => setDone(false)} className="h-11 sm:h-8 text-muted-foreground">
          {t("Import another")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-6 flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4 text-brand" />
          {t("Import with AI")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Paste the text of a recipe website. The AI fills in the form below; check it before saving.")}
        </p>
      </div>
      <Textarea
        aria-label={t("Import with AI")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={RECIPE_IMPORT_MAX_LENGTH}
        disabled={loading}
        placeholder={t("Paste recipe text here…")}
        className="bg-white/5 border-border min-h-[120px] max-h-[40vh] transition-all duration-150 focus-visible:border-brand/50"
      />
      <InlineAlert>{error}</InlineAlert>
      <Button
        type="button"
        variant="outline"
        onClick={generate}
        disabled={loading || !text.trim()}
        className="h-11 sm:h-9 self-stretch sm:self-start transition-all active:scale-[0.97] disabled:active:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("Generating recipe…")}
          </>
        ) : (
          <>
            <Sparkles className="size-4 text-brand" />
            {t("Generate recipe")}
          </>
        )}
      </Button>
    </div>
  );
}
