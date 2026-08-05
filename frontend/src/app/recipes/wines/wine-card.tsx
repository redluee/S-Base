"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/lang";
import { api, type Wine } from "@/lib/api";

const wineTypeStyles: Record<
  string,
  { card: string; badge: string; accent: string; label: string }
> = {
  red: {
    card: "bg-gradient-to-br from-[#2d0f16] to-[#1a080d] border-[#5e1927]/70 hover:border-[#8e253c] text-rose-50 shadow-md hover:shadow-rose-950/40",
    badge: "bg-[#5e1927] text-rose-200 border-[#852338]",
    accent: "text-rose-400",
    label: "Rood",
  },
  white: {
    card: "bg-gradient-to-br from-[#202712] to-[#13190a] border-[#495723]/70 hover:border-[#6f8435] text-amber-50 shadow-md hover:shadow-amber-950/40",
    badge: "bg-[#495723] text-amber-200 border-[#677a31]",
    accent: "text-yellow-400",
    label: "Wit",
  },
  rose: {
    card: "bg-gradient-to-br from-[#2e1320] to-[#1c0a13] border-[#662548]/70 hover:border-[#96376b] text-pink-50 shadow-md hover:shadow-pink-950/40",
    badge: "bg-[#662548] text-pink-200 border-[#8a3262]",
    accent: "text-pink-400",
    label: "Rosé",
  },
  sparkling: {
    card: "bg-gradient-to-br from-[#2b220e] to-[#181307] border-[#5e4b1c]/70 hover:border-[#8e722a] text-amber-50 shadow-md hover:shadow-amber-950/40",
    badge: "bg-[#5e4b1c] text-amber-200 border-[#856a27]",
    accent: "text-amber-300",
    label: "Mousserend",
  },
  dessert: {
    card: "bg-gradient-to-br from-[#24112c] to-[#14091a] border-[#532264]/70 hover:border-[#7d3396] text-purple-50 shadow-md hover:shadow-purple-950/40",
    badge: "bg-[#532264] text-purple-200 border-[#74308c]",
    accent: "text-purple-300",
    label: "Dessert",
  },
};

const purchaseLocationIcons: Record<string, string> = {
  supermarket: "🛒",
  wine_shop: "🍷",
  winery: "🏰",
  online: "🌐",
  restaurant: "🍽️",
  gift: "🎁",
  other: "🛍️",
};

export function WineCard({ wine }: { wine: Wine }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const style = wineTypeStyles[wine.type] ?? wineTypeStyles.red;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.wines.delete(wine.wineId);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete wine:", err);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${style.card}`}
    >
      <div>
        {/* Header row: Image (if any) or Badge + Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium ${style.badge}`}>
            {t(wine.type)}
          </Badge>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <Link href={`/recipes/wines/${wine.wineId}/edit`}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                title={t("Edit")}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </Button>
            </Link>

            {isConfirmingDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="h-7 text-[11px] px-2 bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "..." : t("Delete")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="h-7 text-[11px] px-1.5 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsConfirmingDelete(true)}
                className="size-8 text-zinc-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg"
                title={t("Delete")}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Wine Eticket Photo if present */}
        {wine.imageUrl && (
          <div className="relative w-full h-44 mb-3 rounded-xl overflow-hidden bg-black/40 border border-white/10 group-hover:border-white/20 transition-all">
            <Image
              src={wine.imageUrl}
              alt={wine.brand}
              fill
              className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        )}

        {/* Brand & Variety */}
        <h3 className="font-display font-semibold text-base sm:text-lg leading-tight text-white mb-1">
          {wine.brand}
        </h3>
        <p className="text-xs sm:text-sm font-medium text-white/80 mb-2">
          {wine.variety}
        </p>

        {/* Metadata row: Vintage, Region, Purchase Location & Rating */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70 mb-3">
          {wine.vintage && (
            <span className="inline-flex items-center gap-1 font-medium bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
              📅 {wine.vintage}
            </span>
          )}
          {wine.countryRegion && (
            <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
              📍 {wine.countryRegion}
            </span>
          )}
          {wine.purchaseLocation && (
            <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
              {purchaseLocationIcons[wine.purchaseLocation] ?? "🛍️"} {t(wine.purchaseLocation)}
            </span>
          )}
          {wine.rating != null && (
            <span className={`inline-flex items-center gap-1 font-bold ${style.accent} bg-black/30 px-2 py-0.5 rounded-md border border-white/10`}>
              <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {wine.rating}/10
            </span>
          )}
        </div>

        {wine.notes && (
          <div className="mt-2 rounded-xl bg-black/25 p-2.5 border border-white/10 text-xs text-white/80 leading-relaxed italic">
            &ldquo;{wine.notes}&rdquo;
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
        <span>{new Date(wine.createdAt).toLocaleDateString("nl-NL")}</span>
      </div>
    </div>
  );
}
