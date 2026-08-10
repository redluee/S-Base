"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { X, GitMerge, AlertCircle, Check } from "lucide-react";

interface ExerciseMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  onSuccess: (targetName: string) => void;
}

export function ExerciseMergeModal({
  isOpen,
  onClose,
  sourceName,
  onSuccess,
}: ExerciseMergeModalProps) {
  const [exercises, setExercises] = useState<{ name: string }[]>([]);
  const [targetName, setTargetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen) return;

    const fetchExercises = async () => {
      try {
        setFetching(true);
        const list = await api.workouts.exercises.list();
        if (!isMounted) return;
        setExercises(list);
        setError(null);

        const lowerSource = sourceName.toLowerCase();
        const match = list.find(
          (ex) => ex.name.toLowerCase() === lowerSource && ex.name !== sourceName
        );
        if (match) {
          setTargetName(match.name);
        } else {
          const defaultLower = sourceName.toLowerCase();
          setTargetName(defaultLower !== sourceName ? defaultLower : "");
        }
      } catch {
        if (isMounted) {
          setError(t("Failed to load exercises."));
        }
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    };

    fetchExercises();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceName]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTarget = targetName.trim();
    if (!trimmedTarget) {
      setError(t("Select target exercise"));
      return;
    }
    if (trimmedTarget === sourceName) {
      setError(t("Source and target exercise names must be different."));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.workouts.exercises.merge(sourceName, trimmedTarget);
      onSuccess(trimmedTarget);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Failed to merge exercises.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const otherExercises = exercises.filter((ex) => ex.name !== sourceName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card rounded-2xl ring-1 ring-foreground/10 shadow-2xl p-6 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-brand/10 text-brand shrink-0">
            <GitMerge className="size-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {t("Merge Exercise")}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {sourceName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t("Source exercise")}
            </label>
            <div className="px-3.5 py-2.5 text-sm font-medium bg-foreground/5 text-foreground rounded-xl ring-1 ring-foreground/10 select-none truncate">
              {sourceName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t("Target exercise")}
            </label>
            {fetching ? (
              <div className="px-3.5 py-2.5 text-xs text-muted-foreground bg-foreground/5 rounded-xl animate-pulse">
                {t("Loading...")}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={t("Select target exercise")}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all text-foreground"
                />

                {otherExercises.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      {t("Or select existing exercise:")}
                    </p>
                    <div className="max-h-36 overflow-y-auto rounded-xl ring-1 ring-foreground/10 divide-y divide-foreground/5 bg-background/50">
                      {otherExercises.map((ex) => (
                        <button
                          key={ex.name}
                          type="button"
                          onClick={() => setTargetName(ex.name)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            targetName === ex.name
                              ? "bg-brand/10 text-brand font-medium"
                              : "hover:bg-foreground/5 text-foreground"
                          }`}
                        >
                          <span className="truncate">{ex.name}</span>
                          {targetName === ex.name && <Check className="size-3.5 text-brand shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 text-[11px] text-muted-foreground bg-foreground/5 rounded-xl ring-1 ring-foreground/5 leading-relaxed">
            {t("All templates and workout history for the source exercise will be migrated to the target exercise.")}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer"
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !targetName.trim()}
              className="gap-1.5 cursor-pointer"
            >
              <GitMerge className="size-4" />
              {loading ? t("Merging...") : t("Merge")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
