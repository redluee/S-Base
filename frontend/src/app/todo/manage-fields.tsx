"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { TODO_NAME_MAX } from "@backend/shared/todo";
import { cn } from "@/lib/utils";
import { cleanName } from "./manage-helpers";

export const iconButtonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30 disabled:hover:text-muted-foreground";

const fieldClass =
  "min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-foreground/[0.04] focus:bg-foreground/[0.06]";

interface NameFieldProps {
  value: string;
  label: string;
  onCommit: (name: string) => void;
  className?: string;
}

export function NameField({ value, label, onCommit, className }: NameFieldProps) {
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
      className={cn(fieldClass, className)}
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
      <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
        <Plus className="size-4" />
      </span>
      <input
        value={draft}
        aria-label={label}
        placeholder={label}
        maxLength={TODO_NAME_MAX}
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value)}
        className={fieldClass}
      />
      <button
        type="submit"
        disabled={!name}
        aria-label={label}
        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-zinc-950">
          <ArrowUp className="size-4" aria-hidden="true" />
        </span>
      </button>
    </form>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="pb-2 text-xs font-medium text-muted-foreground">{children}</h3>;
}
