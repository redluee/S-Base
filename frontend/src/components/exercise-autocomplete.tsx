"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

interface Suggestion {
  value: string;
  category?: string;
  defaultSets: number | null;
  defaultReps: number | null;
  equipment?: string | null;
  defaultRestTime?: number | null;
  defaultWeight?: number | null;
  defaultDistance?: number | null;
  defaultDuration?: number | null;
}

export function ExerciseAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onSelect: (
    name: string,
    defaultSets?: number,
    defaultReps?: number,
    category?: string,
    equipment?: string,
    defaultRestTime?: number,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
  ) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const results = await api.workouts.exercises.suggest(q);
      setSuggestions(results as any);
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
    if (!open || !inputRef.current) return;
    function updatePosition() {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showCustomOption = value.trim().length > 0 && !suggestions.some(
    (s) => s.value.toLowerCase() === value.trim().toLowerCase()
  );

  function select(suggestion: Suggestion) {
    onSelect(
      suggestion.value,
      suggestion.defaultSets ?? undefined,
      suggestion.defaultReps ?? undefined,
      suggestion.category ?? undefined,
      suggestion.equipment ?? undefined,
      suggestion.defaultRestTime ?? undefined,
      suggestion.defaultWeight ?? undefined,
      suggestion.defaultDistance ?? undefined,
      suggestion.defaultDuration ?? undefined,
    );
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const totalLength = suggestions.length + (showCustomOption ? 1 : 0);

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
        } else if (activeIndex === suggestions.length && showCustomOption) {
          select({ value: value.trim(), defaultSets: 1, defaultReps: 10 });
        } else if (activeIndex === -1 && value.trim().length > 0) {
          const exactMatch = suggestions.find(
            (s) => s.value.toLowerCase() === value.trim().toLowerCase()
          );
          if (exactMatch) {
            select(exactMatch);
          } else {
            select({ value: value.trim(), defaultSets: 1, defaultReps: 10 });
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
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0 || (value.trim().length > 0 && !suggestions.some(s => s.value.toLowerCase() === value.trim().toLowerCase()))) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t("Exercise")}
        className={cn(
          "bg-white/5 h-9 sm:h-8 border-border text-sm",
          className
        )}
      />
      {open &&
        (suggestions.length > 0 || showCustomOption) &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="z-50 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
          >
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion.value}
                type="button"
                onClick={() => select(suggestion)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-75 ${
                  i === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                }`}
              >
                <span className="flex-1">{suggestion.value}</span>
              </button>
            ))}
            {showCustomOption && (
              <button
                type="button"
                onClick={() => select({ value: value.trim(), defaultSets: 1, defaultReps: 10 })}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-75 ${
                  suggestions.length === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-brand hover:bg-accent/50 font-medium"
                }`}
              >
                <span className="flex-1">{t('Add "{name}"', { name: value.trim() })}</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
