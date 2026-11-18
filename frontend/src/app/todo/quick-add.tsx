"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowUp } from "lucide-react";
import { normalizeTodoTitle, TODO_TITLE_MAX } from "@backend/shared/todo";
import { t } from "@/lib/lang";
import { BottomSheet } from "./bottom-sheet";
import { CategoryChips } from "./category-chips";
import { NO_SELECTION, quickAddPreselection, type ChipSelection } from "./chip-state";
import { DuePicker } from "./due-picker";
import type { SheetOrigin } from "./sheet-morph";
import { useTodoUi } from "./todo-ui";

let quickAddInput: HTMLInputElement | null = null;
let quickAddPanel: HTMLDivElement | null = null;
let quickAddReturn: HTMLElement | null = null;

export function focusQuickAdd(): void {
  if (!quickAddInput) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && !quickAddPanel?.contains(active)) quickAddReturn = active;
  if (quickAddPanel) quickAddPanel.inert = false;
  quickAddInput.focus({ preventScroll: true });
}

function keepInputFocus(e: MouseEvent<HTMLDivElement>) {
  if (e.target instanceof HTMLInputElement) return;
  e.preventDefault();
}

interface QuickAddProps {
  open: boolean;
  origin: SheetOrigin | "instant" | null;
  onClose: () => void;
}

export function QuickAdd({ open, origin, onClose }: QuickAddProps) {
  const { store } = useTodoUi();
  const [title, setTitle] = useState("");
  const [selection, setSelection] = useState<ChipSelection>(NO_SELECTION);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const input = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelection(quickAddPreselection(store.filter, store.categories, store.projects));
      setDueDate(null);
    }
  }

  useEffect(() => {
    openRef.current = open;
    if (open) {
      if (document.activeElement !== input.current) input.current?.focus({ preventScroll: true });
      return;
    }
    if (quickAddReturn?.isConnected) quickAddReturn.focus({ preventScroll: true });
    quickAddReturn = null;
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = normalizeTodoTitle(title);
    if (!value) return;
    setTitle("");
    const created = await store.actions.create({ title: value, ...selection, dueDate });
    if (!created) setTitle((current) => current || value);
  };

  const onBlur = () => {
    if (!openRef.current && quickAddPanel) quickAddPanel.inert = true;
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={t("todo.add")}
      autoFocus={false}
      origin={origin}
      sheetRef={(el) => {
        quickAddPanel = el;
      }}
    >
      <div className="flex flex-col gap-2 px-4 pt-1" onMouseDown={keepInputFocus}>
        <form onSubmit={submit} className="flex items-center gap-1">
          <input
            ref={(el) => {
              input.current = el;
              quickAddInput = el;
            }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onBlur}
            maxLength={TODO_TITLE_MAX}
            placeholder={t("todo.add.placeholder")}
            aria-label={t("todo.add.placeholder")}
            enterKeyHint="enter"
            autoComplete="off"
            className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <DuePicker value={dueDate} onChange={setDueDate} />
          <button
            type="submit"
            aria-label={t("todo.add")}
            disabled={!normalizeTodoTitle(title)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-zinc-950 transition-[opacity,scale] duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-30"
          >
            <ArrowUp className="size-5" />
          </button>
        </form>
        <CategoryChips value={selection} onChange={setSelection} />
      </div>
    </BottomSheet>
  );
}
