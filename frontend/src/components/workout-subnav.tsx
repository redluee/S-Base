"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/lang";
import { Dumbbell, Scale, Calendar } from "lucide-react";

export type WorkoutPageKey = "workouts" | "body" | "exercises" | "history";

interface WorkoutSubnavProps {
  current: WorkoutPageKey;
}

export function WorkoutSubnav({ current }: WorkoutSubnavProps) {
  const items = [
    {
      key: "workouts" as const,
      href: "/workouts",
      label: t("Workouts"),
      icon: Dumbbell,
    },
    {
      key: "body" as const,
      href: "/workouts/body",
      label: t("Body"),
      icon: Scale,
    },
    {
      key: "exercises" as const,
      href: "/workouts/exercises",
      label: t("Exercises"),
      icon: Dumbbell,
    },
    {
      key: "history" as const,
      href: "/workouts/history",
      label: t("History"),
      icon: Calendar,
    },
  ];

  const visibleItems = items.filter((item) => item.key !== current);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.key} href={item.href}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-9 sm:h-10 flex items-center gap-1.5 cursor-pointer"
            >
              <Icon className="size-3.5 sm:size-4 text-brand" />
              <span>{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
