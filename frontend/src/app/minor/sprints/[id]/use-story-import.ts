"use client";

import { t } from "@/lib/lang";
import { api, apiErrorMessage } from "@/lib/api";
import { useState } from "react";
import type { MinorSprintFull } from "@/lib/api";

export function useStoryImport(sprint: MinorSprintFull, reloadSprint: (keepLocalEvals?: boolean) => Promise<void>, setViewingStoryId: (id: number | null) => void, report: (err: unknown, fallbackKey: string) => void) {
  const [isImportStoryModalOpen, setIsImportStoryModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportingStory, setIsImportingStory] = useState(false);

  async function handlePasteClipboardToImport() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setImportJsonText(text);
          setImportError(null);
        }
      }
    } catch (err) {
      report(err, "minor.actionFailed");
    }
  }

  async function handleImportStory(e: React.FormEvent) {
    e.preventDefault();
    if (!importJsonText.trim()) {
      setImportError(t("Voer JSON in om te importeren."));
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(importJsonText);
    } catch {
      setImportError(t("Ongeldig JSON-formaat. Controleer de syntax."));
      return;
    }

    try {
      setIsImportingStory(true);
      setImportError(null);
      const created = await api.minor.stories.importJson(sprint.id, parsed);
      await reloadSprint();
      setIsImportStoryModalOpen(false);
      setImportJsonText("");
      if (created?.id) {
        setViewingStoryId(created.id);
      }
    } catch (err: unknown) {
      setImportError(apiErrorMessage(err, "Fout bij importeren van story."));
    } finally {
      setIsImportingStory(false);
    }
  }

  return {
    isImportStoryModalOpen,
    setIsImportStoryModalOpen,
    importJsonText,
    setImportJsonText,
    importError,
    setImportError,
    isImportingStory,
    setIsImportingStory,
    handlePasteClipboardToImport,
    handleImportStory,
  };
}
