"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { TODO_NAME_MAX } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { cleanName } from "./manage-helpers";

export const iconButtonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30 disabled:hover:text-muted-foreground";

const fieldClass =
  "min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-foreground/5";

export function NameField({ value, label, onCommit }: { value: string; label: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [source, setSource] = useState(value);
  if (source !== value) {
    setSource(value);
    setDraft(value);
  }

  const commit = () => {
    const name = cleanName(draft);
    if (!name) return setDraft(value);
    setDraft(name);
    if (name !== value) onCommit(name);
  };

  return (
    <input
      value={draft}
      aria-label={label}
      maxLength={TODO_NAME_MAX}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape" && draft !== value) {
          e.stopPropagation();
          setDraft(value);
        }
      }}
      className={fieldClass}
    />
  );
}

export function AddField({ label, onAdd }: { label: string; onAdd: (name: string) => Promise<unknown> }) {
  const [draft, setDraft] = useState("");
  const name = cleanName(draft);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setDraft("");
    await onAdd(name);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        value={draft}
        aria-label={label}
        placeholder={label}
        maxLength={TODO_NAME_MAX}
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value)}
        className={fieldClass}
      />
      <button type="submit" disabled={!name} aria-label={label} className={cn(iconButtonClass, "text-foreground")}>
        <Plus className="size-5" />
      </button>
    </form>
  );
}

interface RowActionsProps {
  label: string;
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onDelete?: () => void;
  deleteLabel?: string;
}

export function RowActions({ label, onUp, onDown, onDelete, deleteLabel }: RowActionsProps) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        className={iconButtonClass}
        disabled={!onUp}
        onClick={onUp ?? undefined}
        aria-label={`${t("todo.manage.moveUp")}: ${label}`}
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        className={iconButtonClass}
        disabled={!onDown}
        onClick={onDown ?? undefined}
        aria-label={`${t("todo.manage.moveDown")}: ${label}`}
      >
        <ChevronDown className="size-4" />
      </button>
      {onDelete && (
        <button
          type="button"
          className={cn(iconButtonClass, "hover:text-destructive")}
          onClick={onDelete}
          aria-label={`${deleteLabel}: ${label}`}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</p>;
}
