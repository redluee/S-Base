"use client";

import { useEffect, useRef, useState } from "react";
import { TODO_NOTES_MAX } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { createDebouncedSaver } from "./block-motion";
import { LightMarkdown } from "./light-markdown";

interface Props {
  value: string;
  onSave: (notes: string) => void;
}

export function NotesField({ value, onSave }: Props) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef(onSave);
  const lastSaved = useRef(value);
  const saver = useRef<ReturnType<typeof createDebouncedSaver<string>> | null>(null);

  useEffect(() => {
    saveRef.current = onSave;
  });

  useEffect(() => {
    const instance = createDebouncedSaver<string>((notes) => {
      if (notes === lastSaved.current) return;
      lastSaved.current = notes;
      saveRef.current(notes);
    }, 400);
    saver.current = instance;
    return () => {
      instance.flush();
      saver.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editing && value !== lastSaved.current) {
      lastSaved.current = value;
      setDraft(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  useEffect(() => {
    const el = area.current;
    if (!editing || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  if (editing) {
    return (
      <textarea
        ref={area}
        value={draft}
        maxLength={TODO_NOTES_MAX}
        aria-label={t("todo.block.notes")}
        placeholder={t("todo.block.notesPlaceholder")}
        onChange={(e) => {
          setDraft(e.target.value);
          saver.current?.schedule(e.target.value);
        }}
        onBlur={() => {
          saver.current?.flush();
          setEditing(false);
        }}
        className="min-h-24 w-full resize-none rounded-lg p-3 text-sm leading-relaxed bg-foreground/[0.06] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-brand"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setEditing(true);
        }
      }}
      aria-label={t("todo.block.notes")}
      className="block min-h-11 w-full cursor-text rounded-lg p-3 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-brand"
    >
      {draft.trim() ? (
        <LightMarkdown source={draft} />
      ) : (
        <span className="text-sm text-muted-foreground">{t("todo.block.notesPlaceholder")}</span>
      )}
    </div>
  );
}
