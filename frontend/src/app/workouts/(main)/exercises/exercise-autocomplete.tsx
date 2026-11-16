"use client";

import { useState, useRef, useEffect, useCallback, useId, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";
import { computeDropdownPlacement, type DropdownSide } from "@/lib/dropdown-placement";
import type { ExerciseSuggestion } from "@backend/types/workout";
import type { HistorySetInput } from "@/app/workouts/session/workout-session-helpers";

type Suggestion = ExerciseSuggestion;

const LIST_MAX_HEIGHT = 224;
const LIST_GAP = 4;
const LIST_MIN_USEFUL_HEIGHT = 88;
const DEFAULT_PLACEMENT = `bottom:${LIST_MAX_HEIGHT}:0`;

function measurePlacement(input: HTMLInputElement): string {
  const rect = input.getBoundingClientRect();
  const viewport = window.visualViewport;
  const { side, maxHeight, cramped } = computeDropdownPlacement({
    anchorTop: rect.top,
    anchorBottom: rect.bottom,
    viewportTop: viewport ? viewport.offsetTop : 0,
    viewportHeight: viewport ? viewport.height : window.innerHeight,
    desiredMaxHeight: LIST_MAX_HEIGHT,
    gap: LIST_GAP,
    minUsefulHeight: LIST_MIN_USEFUL_HEIGHT,
  });
  return `${side}:${maxHeight}:${cramped ? 1 : 0}`;
}

export function ExerciseAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onSelect?: (
    name: string,
    defaultSets?: number,
    defaultReps?: number,
    category?: string,
    equipment?: string,
    defaultRestTime?: number,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    perSide?: boolean,
    isAssisted?: boolean,
    lastSets?: HistorySetInput[],
  ) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const scrolledIntoViewRef = useRef(false);
  const listOpen = open && suggestions.length > 0;

  const subscribePlacement = useCallback(
    (notify: () => void) => {
      if (!listOpen) return () => {};
      const viewport = window.visualViewport;
      viewport?.addEventListener("resize", notify);
      viewport?.addEventListener("scroll", notify);
      window.addEventListener("resize", notify);
      window.addEventListener("scroll", notify, { capture: true, passive: true });
      return () => {
        viewport?.removeEventListener("resize", notify);
        viewport?.removeEventListener("scroll", notify);
        window.removeEventListener("resize", notify);
        window.removeEventListener("scroll", notify, { capture: true });
      };
    },
    [listOpen],
  );
  const readPlacement = useCallback(
    () => (listOpen && inputRef.current ? measurePlacement(inputRef.current) : DEFAULT_PLACEMENT),
    [listOpen],
  );
  const placement = useSyncExternalStore(subscribePlacement, readPlacement, () => DEFAULT_PLACEMENT);
  const [listSide, listMaxHeight, listCramped] = placement.split(":") as [DropdownSide, string, string];
  const cramped = listCramped === "1";

  useEffect(() => {
    if (!listOpen) {
      scrolledIntoViewRef.current = false;
      return;
    }
    if (cramped && !scrolledIntoViewRef.current) {
      scrolledIntoViewRef.current = true;
      inputRef.current?.scrollIntoView({ block: "center" });
    }
  }, [listOpen, cramped]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const results = await api.workouts.exercises.suggest(q);
      setSuggestions(results);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  function select(suggestion: Partial<Suggestion> & { value: string }) {
    onChange(suggestion.value);
    onSelect?.(
      suggestion.value,
      suggestion.defaultSets ?? undefined,
      suggestion.defaultReps ?? undefined,
      suggestion.category ?? undefined,
      suggestion.equipment ?? undefined,
      suggestion.defaultRestTime ?? undefined,
      suggestion.defaultWeight ?? undefined,
      suggestion.defaultDistance ?? undefined,
      suggestion.defaultDuration ?? undefined,
      Boolean(suggestion.perSide),
      Boolean(suggestion.isAssisted),
      suggestion.lastSets,
    );
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const totalLength = suggestions.length;

    if (!open) {
      if (e.key === "ArrowDown" && totalLength > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalLength - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalLength - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          select(suggestions[activeIndex]);
        } else if (activeIndex === -1 && value.trim().length > 0) {
          const exactMatch = suggestions.find(
            (s) => s.value.toLowerCase() === value.trim().toLowerCase()
          );
          if (exactMatch) {
            select(exactMatch);
          } else {
            select({
              value: value.trim(),
              defaultSets: 1,
              defaultReps: 10,
            });
          }
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t("Exercise")}
        className={cn(
          "bg-white/5 h-11 border-border text-sm",
          className
        )}
      />
      {listOpen && (
        <div
          id={listId}
          role="listbox"
          style={{ maxHeight: Number(listMaxHeight) }}
          className={cn(
            "absolute left-0 w-full z-50 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground",
            listSide === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {suggestions.map((suggestion, i) => (
            <button
              key={`${suggestion.value}-${i}`}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                select(suggestion);
              }}
              onClick={() => select(suggestion)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-3 px-3 min-h-11 text-left text-sm transition-colors duration-75 ${
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <span className="flex-1">{suggestion.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
