"use client";

import { useState, useRef, useEffect } from "react";
import { kitchens, type Kitchen } from "@/lib/kitchens";
import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";

export function KitchenCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = kitchens.filter(
    (k) =>
      k.name.toLowerCase().includes(query.toLowerCase()) ||
      k.flag.includes(query),
  );

  function select(kitchen: Kitchen) {
    setQuery(kitchen.name);
    onChange(kitchen.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery("");
    onChange("");
    setOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = kitchens.find((k) => k.name === value);

  return (
    <div className="relative">
      {selected && !open && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg">
          {selected.flag}
        </span>
      )}
      <Input
        ref={inputRef}
        id="kitchen"
        placeholder={t("Search a kitchen…")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && filtered.length > 0) {
            select(filtered[0]);
          }
        }}
        className={`bg-white/5 border-border ${selected && !open ? "pl-10" : ""}`}
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-zinc-900 shadow-lg"
        >
          {query && (
            <button
              type="button"
              onClick={clear}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/5 transition-colors border-b border-border/50"
            >
              {t("Clear")}
            </button>
          )}
          {filtered.map((kitchen) => (
            <button
              key={kitchen.name}
              type="button"
              onClick={() => select(kitchen)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                kitchen.name === value
                  ? "bg-brand/10 text-brand"
                  : "text-foreground"
              }`}
            >
              <span className="text-lg">{kitchen.flag}</span>
              <span>{kitchen.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
