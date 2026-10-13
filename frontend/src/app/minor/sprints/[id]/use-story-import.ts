"use client";

import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import { useState } from "react";
import { parseStoryJson } from "./story-json";
import type { MinorSprintFull } from "@/lib/api";

export function useStoryImport(sprint: MinorSprintFull, reloadSprint: (keepLocalEvals?: boolean) => Promise<void>, setViewingStoryId: (id: number | null) => void) {
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
      console.error("Failed to read clipboard:", err);
    }
  }

  async function handleImportStory(e: React.FormEvent) {
    e.preventDefault();
    if (!importJsonText.trim()) {
      setImportError(t("Voer JSON in om te importeren."));
      return;
    }

    try {
      const payload = parseStoryJson(importJsonText);
      setIsImportingStory(true);
      setImportError(null);

      const created = await api.minor.sprints.stories.create(sprint.id, payload);
      await reloadSprint();
      setIsImportStoryModalOpen(false);
      setImportJsonText("");
      if (created?.id) {
        setViewingStoryId(created.id);
      }
    } catch (err: unknown) {
      console.error("Story import error:", err);
      const msg = err instanceof Error ? err.message : t("Fout bij importeren van story.");
      setImportError(msg);
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
