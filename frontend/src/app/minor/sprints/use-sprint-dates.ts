"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SprintCalculatedDates } from "./sprint-form-modal";

export function useSprintDates(
  startDate: string,
  durationDays: number,
  enabled: boolean,
  report: (err: unknown, fallbackKey: string) => void,
) {
  const [calculatedDates, setCalculatedDates] = useState<SprintCalculatedDates>(null);
  useEffect(() => {
    if (!enabled || !startDate || durationDays <= 0) return;
    let current = true;
    api.minor.sprints
      .calculateDates(startDate, durationDays)
      .then((res) => current && setCalculatedDates(res))
      .catch((err) => report(err, "minor.actionFailed"));
    return () => {
      current = false;
    };
  }, [startDate, durationDays, enabled, report]);
  return calculatedDates;
}
