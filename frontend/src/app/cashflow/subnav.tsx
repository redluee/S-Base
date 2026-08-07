"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderOpen, FileText, Building2 } from "lucide-react";
import { t } from "@/lib/lang";

const links = [
  { href: "/cashflow", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/cashflow/invoices", label: "Facturen", icon: FileText, exact: false },
  { href: "/cashflow/projects", label: "Projecten", icon: FolderOpen, exact: false },
  { href: "/cashflow/clients", label: "Klanten", icon: Users, exact: false },
  { href: "/cashflow/trade-names", label: "Handelsnamen", icon: Building2, exact: false },
];

export function CashflowSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 py-2 border-b border-border bg-zinc-950/60 backdrop-blur-sm">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? "bg-blue-500/15 border border-blue-500/30 text-blue-400"
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
