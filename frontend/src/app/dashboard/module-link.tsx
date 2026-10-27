"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useModuleTransition } from "@/components/module-transition-provider";
import { t } from "@/lib/lang";
import type { ModuleDefinition } from "./dashboard-modules";
import { ModuleIcon } from "./module-icon";

export function ModuleLink({ module, children, className, style }: {
  module: ModuleDefinition;
  children: ReactNode;
  className: string;
  style: CSSProperties;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const pointerNavigation = useRef(false);
  const begin = useModuleTransition();

  return (
    <Link
      ref={link}
      href={module.href}
      className={className}
      style={style}
      onClick={(event) => { pointerNavigation.current = event.detail > 0; }}
      onNavigate={() => {
        if (!link.current || !pointerNavigation.current) return;
        begin({
          title: t(module.title),
          subtitle: t(module.subtitle),
          color: module.accentColor,
          icon: <ModuleIcon id={module.id} />,
          rect: link.current.getBoundingClientRect(),
        });
      }}
    >
      {children}
    </Link>
  );
}
