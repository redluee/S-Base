"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/lang";

export function TemplateDraftNotice({
  kind,
  onLoadStale,
  onDiscard,
}: {
  kind: "restored" | "stale";
  onLoadStale: () => void;
  onDiscard: () => void;
}) {
  return (
<div role="status" className="rounded-lg bg-card border border-border px-4 py-3 text-sm flex flex-col gap-3 min-w-0">
        <p className="text-foreground break-words">
          {kind === "restored"
            ? t("Unsaved draft restored from this device.")
            : t("An older unsaved draft exists, but this template has changed since.")}
        </p>
        <div className="flex flex-wrap gap-2">
          {kind === "stale" && (
            <Button type="button" variant="outline" onClick={onLoadStale} className="min-h-11 min-w-11">
              {t("Load draft anyway")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onDiscard} className="min-h-11 min-w-11">
            {t("Discard draft")}
          </Button>
        </div>
      </div>
  );
}
