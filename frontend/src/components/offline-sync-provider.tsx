"use client";

import { useEffect } from "react";
import { initOfflineWorkoutSync } from "@/lib/offline-workout";

export function OfflineSyncProvider() {
  useEffect(() => {
    const cleanup = initOfflineWorkoutSync();
    return () => {
      cleanup();
    };
  }, []);

  return null;
}
