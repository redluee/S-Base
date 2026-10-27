"use client";

import type { CSSProperties } from "react";
import { ModuleLink } from "./module-link";
import { ArrowUpRight } from "lucide-react";
import { t } from "@/lib/lang";
import { MODULES } from "./dashboard-modules";
import { ModuleIcon } from "./module-icon";

export function ModuleGrid({
  canAccess,
  hasOnlineServer,
}: {
  canAccess: (moduleId: string) => boolean;
  hasOnlineServer: boolean;
}) {
  return (
    <nav className="relative z-10 grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4">
      {MODULES.filter((module) => canAccess(module.id)).map((module) => {
        const compact = module.id === "lyric_quotes" || module.id === "you";
        const fullWidth = module.id === "workout" || module.id === "pulse";
        const style = {
          "--tile-color": module.accentColor,
          "--tile-tint": `${module.accentColor}26`,
          "--tile-border": `${module.accentColor}4d`,
          "--tile-glow": module.glowColor,
        } as CSSProperties;
        const content = (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--tile-tint)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
            <div className={`relative z-10 flex min-w-0 gap-2 sm:flex-row sm:items-center sm:gap-3.5 ${fullWidth ? "flex-row items-center" : "flex-col"}`}>
              <div className={`relative flex shrink-0 items-center justify-center squircle-icon border border-[var(--tile-border)] bg-[var(--tile-tint)] text-[var(--tile-color)] shadow-[0_0_1.5rem_-0.25rem_var(--tile-glow)] transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none ${compact ? "size-8" : "size-9 sm:size-11"}`}>
                <ModuleIcon id={module.id} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-white sm:text-base">
                    {t(module.title)}
                  </h2>
                  {module.id === "minecraft" && hasOnlineServer && (
                    <span className="size-1.5 shrink-0 rounded-full bg-[#76FF03]" />
                  )}
                </div>
                <p className={`mt-0.5 truncate text-xs font-medium tracking-wide text-zinc-400 ${compact ? "hidden" : fullWidth ? "block" : "hidden sm:block"}`}>
                  {t(module.subtitle)}
                </p>
              </div>
            </div>
            <div className={`z-10 flex shrink-0 items-center justify-center text-[var(--tile-color)] transition-colors motion-reduce:transition-none ${compact
              ? "absolute right-3 top-3 size-4 opacity-60 group-hover:opacity-100 sm:static sm:ml-2"
              : `size-7 squircle-action border border-[var(--tile-border)] bg-[var(--tile-tint)] group-hover:bg-[var(--tile-color)] group-hover:text-zinc-950 sm:static sm:ml-2 sm:size-8 ${fullWidth ? "relative ml-2" : "absolute right-3 top-3"}`}`}>
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </div>
          </>
        );
        const className = `group relative flex min-w-0 items-center justify-between overflow-hidden squircle-card border border-white/[0.08] bg-zinc-900/80 p-3 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-[var(--tile-border)] hover:shadow-[0_0_2rem_-0.5rem_var(--tile-glow)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tile-color)] motion-reduce:transform-none motion-reduce:transition-none ${compact ? "min-h-16 sm:px-4" : fullWidth ? "col-span-2 min-h-20 sm:p-4" : "min-h-24 sm:min-h-20 sm:p-4"}`;

        return module.external ? (
          <a key={module.id} href={module.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
            {content}
          </a>
        ) : (
          <ModuleLink key={module.id} module={module} className={className} style={style}>
            {content}
          </ModuleLink>
        );
      })}
    </nav>
  );
}
