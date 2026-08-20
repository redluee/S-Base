"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { UserCheck, ArrowRightLeft, Loader2 } from "lucide-react";

interface ImpersonationBannerProps {
  username: string;
  impersonatedBy: string;
}

export function ImpersonationBanner({ username, impersonatedBy }: ImpersonationBannerProps) {
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);

  async function handleStopImpersonation() {
    setIsStopping(true);
    try {
      await api.stopImpersonate();
      router.push("/pulse");
      router.refresh();
    } catch {
      setIsStopping(false);
    }
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs backdrop-blur-md sticky top-0 z-50 transition-all animate-in fade-in slide-in-from-top-1">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <div className="size-5 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <UserCheck className="size-3.5" />
          </div>
          <span className="font-medium text-amber-100">
            {t("Test mode active")}:{" "}
            <span className="text-zinc-300">
              {t("You are currently logged in as {username} (impersonated by {admin})", {
                username,
                admin: impersonatedBy,
              })}
            </span>
          </span>
        </div>

        <button
          onClick={handleStopImpersonation}
          disabled={isStopping}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isStopping ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>{t("Returning to admin...")}</span>
            </>
          ) : (
            <>
              <ArrowRightLeft className="size-3" />
              <span>{t("Stop impersonation")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
