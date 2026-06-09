"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { kitchens } from "@/lib/kitchens";
import { t } from "@/lib/lang";

interface Suggestion {
  type: "recipe" | "ingredient" | "kitchen";
  value: string;
}

export function SearchBar() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const remote = await api.recipes.suggest(q);
      const localKitchens = kitchens
        .filter((k) => k.name.toLowerCase().includes(q.toLowerCase()))
        .filter((k) => !remote.some((r) => r.type === "kitchen" && r.value === k.name))
        .map((k) => ({ type: "kitchen" as const, value: k.name }));
      const all = [...remote, ...localKitchens];
      setSuggestions(all);
      setActiveIndex(-1);
      setOpen(all.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!expanded) return;
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, expanded, fetchSuggestions]);

  useEffect(() => {
    if (!open || !inputRef.current) return;
    function updatePosition() {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 4,
        width: Math.max(rect.width, 240),
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submit(value: string) {
    if (!value.trim()) return;
    setExpanded(false);
    setQuery("");
    setOpen(false);
    router.push(`/recipes?q=${encodeURIComponent(value.trim())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter") {
        submit(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          submit(suggestions[activeIndex].value);
        } else {
          submit(query);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }

  function toggle() {
    if (expanded) {
      setExpanded(false);
      setQuery("");
      setOpen(false);
    } else {
      setExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <div
        className={`flex items-center gap-2 transition-all duration-200 ease-strong overflow-hidden ${
          expanded ? "w-44 sm:w-60" : "w-9"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t("Search")}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={t("Search recipes\u2026")}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        />
      </div>
      {open &&
        suggestions.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            onMouseDown={(e) => e.stopPropagation()}
            className="z-50 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
          >
            {suggestions.map((suggestion, i) => (
              <button
                key={`${suggestion.type}-${suggestion.value}`}
                type="button"
                onClick={() => submit(suggestion.value)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-75 ${
                  i === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                }`}
              >
                <span className="flex-1 truncate">{suggestion.value}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {suggestion.type === "recipe"
                    ? t("Recipe")
                    : suggestion.type === "ingredient"
                      ? t("Ingredient")
                      : t("Kitchen")}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
