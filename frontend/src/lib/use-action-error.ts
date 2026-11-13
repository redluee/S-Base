"use client";

import { useCallback, useState } from "react";
import { apiErrorMessage } from "@/lib/api";

export function useActionError() {
  const [error, setError] = useState<string | null>(null);
  const report = useCallback((err: unknown, fallbackKey: string) => setError(apiErrorMessage(err, fallbackKey)), []);
  const clear = useCallback(() => setError(null), []);
  return { error, report, clear };
}
