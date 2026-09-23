"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { t } from "@/lib/lang";
import { MINOR_THEME_COOKIE, type MinorTheme } from "@/lib/minor-theme";

const MinorThemeContext = createContext<{ theme: MinorTheme; toggle: () => void } | null>(null);

export function MinorThemeProvider({ initialTheme, children }: { initialTheme: MinorTheme; children: React.ReactNode }) {
  const [theme, setTheme] = useState<MinorTheme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.minorTheme = theme;
    return () => {
      delete root.dataset.minorTheme;
    };
  }, [theme]);

  const toggle = () => {
    const next: MinorTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.cookie = `${MINOR_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <MinorThemeContext.Provider value={{ theme, toggle }}>
      <div data-minor-theme={theme} className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </div>
    </MinorThemeContext.Provider>
  );
}

export function MinorThemeToggle() {
  const ctx = useContext(MinorThemeContext);
  if (!ctx) return null;
  const isLight = ctx.theme === "light";
  const label = isLight ? t("Dark theme") : t("Light theme");
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-label={label}
      aria-pressed={isLight}
      title={label}
      className="ml-auto shrink-0 flex items-center justify-center size-11 sm:size-8 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
