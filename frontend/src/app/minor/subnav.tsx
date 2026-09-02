"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, ListChecks, Users, Settings, Upload } from "lucide-react";
import { t } from "@/lib/lang";

const links = [
  { href: "/minor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/minor/sprints", label: "Sprints", icon: Layers, exact: false },
  { href: "/minor/stories", label: "User Stories", icon: ListChecks, exact: false },
  { href: "/minor/peer-help", label: "Kennisdeling", icon: Users, exact: false },
  { href: "/minor/settings", label: "Instellingen", icon: Settings, exact: false },
  { href: "/minor/export", label: "Exporteren", icon: Upload, exact: false },
];

export function MinorSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 py-2 border-b border-border bg-zinc-950/60 backdrop-blur-sm">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs leading-none font-semibold whitespace-nowrap transition-all ${
              active
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Icon className="size-3.5" />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
