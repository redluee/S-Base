"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CashflowClient } from "@/lib/api";

export function ClientAutocomplete({
  clients,
  selectedClientId,
  onSelectClient,
  placeholder = "Selecteer klant",
  className,
}: {
  clients: CashflowClient[];
  selectedClientId: number | string;
  onSelectClient: (client: CashflowClient | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const selectedClient = clients.find((c) => c.id === Number(selectedClientId));
  const [query, setQuery] = useState(selectedClient?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const matched = clients.find((c) => c.id === Number(selectedClientId));
    setQuery(matched?.name ?? "");
  }, [selectedClientId, clients]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

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
        // Reset query to selected client name if user closed without picking
        const matched = clients.find((c) => c.id === Number(selectedClientId));
        setQuery(matched?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedClientId, clients]);

  function handleSelect(client: CashflowClient) {
    setQuery(client.name);
    onSelectClient(client);
    setOpen(false);
  }

  function handleClear() {
    setQuery("");
    onSelectClient(null);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" && filteredClients.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredClients.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredClients.length) {
          handleSelect(filteredClients[activeIndex]);
        } else if (filteredClients.length > 0) {
          handleSelect(filteredClients[0]);
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
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (!e.target.value.trim()) {
            onSelectClient(null);
          }
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500",
          className
        )}
      />
      {open &&
        filteredClients.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="z-50 max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 text-white shadow-xl"
          >
            {filteredClients.map((client, i) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                  i === activeIndex
                    ? "bg-zinc-800 text-blue-400"
                    : "text-zinc-200 hover:bg-zinc-800/80"
                }`}
              >
                <span>{client.name}</span>
                {client.email && (
                  <span className="text-xs text-zinc-500">{client.email}</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
