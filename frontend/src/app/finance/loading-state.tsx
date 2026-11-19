import { t } from "@/lib/lang";
import { panel } from "./ui";

export function FinanceProgress({ active }: { active: boolean }) {
  return (
    <>
      <span role="status" className="sr-only">{active ? t("finance.loading") : ""}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden transition-opacity duration-300 ${active ? "opacity-100 delay-150" : "opacity-0"}`}
      >
        <span className="block h-full w-2/5 bg-linear-to-r from-transparent via-brand to-transparent motion-safe:animate-[finance-progress_1.1s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:w-full motion-reduce:animate-pulse" />
      </span>
    </>
  );
}

const bone = "animate-pulse rounded-md bg-foreground/10";

export function FinanceSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        <div className="flex gap-1">
          {["w-14", "w-12", "w-12", "w-11"].map((width, index) => <span key={index} className={`h-11 ${width} ${bone}`} />)}
        </div>
        <span className={`h-11 min-w-0 flex-1 sm:w-48 sm:flex-none ${bone}`} />
      </div>
      <div className={`${panel} space-y-5`}>
        <span className={`block h-4 w-48 max-w-full ${bone}`} />
        <span className={`block h-12 w-64 max-w-full ${bone}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((index) => <div key={index} className={`${panel} space-y-4`}>
          <span className={`block h-4 w-24 max-w-full ${bone}`} />
          <span className={`block h-9 w-40 max-w-full ${bone}`} />
        </div>)}
      </div>
    </div>
  );
}
