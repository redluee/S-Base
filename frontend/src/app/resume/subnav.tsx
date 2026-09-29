"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, UserRound, Briefcase, GraduationCap } from "lucide-react";
import { t } from "@/lib/lang";

const links = [
  { href: "/resume", label: "Mijn CV's", icon: FileText, exact: true },
  { href: "/resume/profile", label: "Profiel", icon: UserRound, exact: false },
  { href: "/resume/experience", label: "Ervaring", icon: Briefcase, exact: false },
  { href: "/resume/education", label: "Opleidingen", icon: GraduationCap, exact: false },
];

export function ResumeSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto px-4 sm:px-6 py-2 border-b border-border bg-background/60 backdrop-blur-sm scrollbar-none">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href || /^\/resume\/\d+/.test(pathname) : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active
                ? "bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Icon className="size-4 sm:size-3.5 shrink-0" />
            <span>{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
