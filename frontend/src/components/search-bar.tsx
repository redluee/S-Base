"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { t } from "@/lib/lang";

export interface SearchSuggestion {
  value: string;
  typeLabel: string;
  href?: string;
}

export interface SearchConfig {
  placeholder: string;
  ariaLabel: string;
  suggest: (q: string) => Promise<SearchSuggestion[]>;
  searchHref: (query: string, pathname: string) => string;
}

export function SearchBar({ config }: { config: SearchConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
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
      const all = await config.suggest(q);
      setSuggestions(all);
      setActiveIndex(-1);
      setOpen(all.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, [config]);

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
      const menuWidth = Math.max(rect.width, 240);
      const maxLeft = window.innerWidth - menuWidth - 8;
      const left = Math.min(rect.left, Math.max(8, maxLeft));
      setMenuStyle({
        position: "fixed",
        left,
        top: rect.bottom + 4,
        width: menuWidth,
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

    const match = suggestions.find((s) => s.value === value);
    router.push(match?.href ?? config.searchHref(value.trim(), pathname));
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
          className="shrink-0 size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
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
          placeholder={t(config.placeholder)}
          aria-label={t(config.ariaLabel)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand rounded min-w-0"
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
                key={`${suggestion.typeLabel}-${suggestion.value}`}
                type="button"
                onClick={() => submit(suggestion.value)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-75 cursor-pointer ${
                  i === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                }`}
              >
                <span className="flex-1 truncate">{suggestion.value}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {t(suggestion.typeLabel)}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
