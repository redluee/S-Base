"use client";

import Link from "next/link";
import { t } from "@/lib/lang";
import { Dumbbell, Scale, Calendar, ListChecks } from "lucide-react";

export type WorkoutPageKey = "workouts" | "body" | "exercises" | "history";

export function WorkoutSubnav({ current }: { current: WorkoutPageKey }) {
  const items = [
    { key: "workouts" as const, href: "/workouts", label: t("Workouts"), icon: Dumbbell },
    { key: "body" as const, href: "/workouts/body", label: t("Body"), icon: Scale },
    { key: "exercises" as const, href: "/workouts/exercises", label: t("Exercises"), icon: ListChecks },
    { key: "history" as const, href: "/workouts/history", label: t("History"), icon: Calendar },
  ].filter((item) => item.key !== current);

  return (
    <nav
      aria-label={t("Workouts")}
      className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className="min-h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 text-sm text-foreground hover:bg-white/10 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon className="size-4 text-brand" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
