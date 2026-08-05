"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/lang";
import { api, type Wine } from "@/lib/api";

import { compressImage } from "@/lib/image";
import { Loader2 } from "lucide-react";

const WINE_TYPES = [
  { value: "red", label: "Rood (Red)" },
  { value: "white", label: "Wit (White)" },
  { value: "rose", label: "Rosé" },
  { value: "sparkling", label: "Mousserend (Sparkling)" },
  { value: "dessert", label: "Dessertwijn" },
];

const PURCHASE_LOCATIONS = [
  { value: "supermarket", label: "Supermarkt" },
  { value: "wine_shop", label: "Wijnwinkel" },
  { value: "winery", label: "Wijnhuis" },
  { value: "online", label: "Webshop / Online" },
  { value: "restaurant", label: "Horeca / Restaurant" },
  { value: "gift", label: "Cadeau gekregen" },
  { value: "other", label: "Overig" },
];

export function WineForm({ wine }: { wine?: Wine }) {
  const router = useRouter();

  const [brand, setBrand] = useState(wine?.brand ?? "");
  const [type, setType] = useState<string>(wine?.type ?? "red");
  const [variety, setVariety] = useState(wine?.variety ?? "");
  const [vintage, setVintage] = useState<string>(wine?.vintage ? String(wine.vintage) : "");
  const [countryRegion, setCountryRegion] = useState(wine?.countryRegion ?? "");
  const [purchaseLocation, setPurchaseLocation] = useState<string>(wine?.purchaseLocation ?? "");
  const [rating, setRating] = useState<string>(wine?.rating != null ? String(wine.rating) : "");
  const [notes, setNotes] = useState(wine?.notes ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(wine?.imageUrl ?? null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "optimizing" | "uploading">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let tempUrl: string | null = null;
    try {
      setIsUploading(true);
      setError(null);
      setUploadStage("optimizing");
      setUploadProgress(0);

      // Create instant visual preview
      tempUrl = URL.createObjectURL(file);
      setPreviewUrl(tempUrl);

      // Compress image client side
      const compressedBlob = await compressImage(file);

      // Upload compressed image
      setUploadStage("uploading");
      const res = await api.wines.uploadPhoto(compressedBlob, file.name, (pct) => {
        setUploadProgress(pct);
      });

      setImageUrl(res.filePath);
    } catch (err: unknown) {
      console.error("Failed to upload photo:", err);
      setError(err instanceof Error ? err.message : t("Failed to upload photo"));
    } finally {
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      setPreviewUrl(null);
      setIsUploading(false);
      setUploadStage("idle");
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brand.trim()) {
      setError(t("Brand is required."));
      return;
    }
    if (!variety.trim()) {
      setError(t("Variety is required."));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        brand: brand.trim(),
        type,
        variety: variety.trim(),
        vintage: vintage ? parseInt(vintage, 10) : null,
        countryRegion: countryRegion.trim() || null,
        purchaseLocation: purchaseLocation || null,
        rating: rating !== "" ? parseInt(rating, 10) : null,
        notes: notes.trim() || null,
        imageUrl,
      };

      if (wine) {
        await api.wines.update(wine.wineId, payload);
      } else {
        await api.wines.create(payload);
      }

      router.push("/recipes/wines");
      router.refresh();
    } catch (err: unknown) {
      console.error("Failed to save wine:", err);
      setError(err instanceof Error ? err.message : "Save failed");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto bg-card p-5 sm:p-7 rounded-2xl ring-1 ring-foreground/10">
      {error && (
        <div className="p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-medium">
          {error}
        </div>
      )}

      {/* Brand / Winery */}
      <div className="space-y-2">
        <Label htmlFor="brand" className="text-foreground font-medium">
          {t("Brand / Winery")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="brand"
          placeholder="e.g. Château Margaux, Salentein, Barefoot..."
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          required
          className="bg-background"
        />
      </div>

      {/* Type Dropdown & Variety */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-foreground font-medium">
            {t("Wine type")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {WINE_TYPES.map((wt) => (
              <option key={wt.value} value={wt.value}>
                {wt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="variety" className="text-foreground font-medium">
            {t("Variety / Grape")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="variety"
            placeholder="e.g. Cabernet Sauvignon, Pinot Noir..."
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            required
            className="bg-background"
          />
        </div>
      </div>

      {/* Vintage & Country/Region */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vintage" className="text-foreground font-medium">
            {t("Vintage / Year")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
          </Label>
          <Input
            id="vintage"
            type="number"
            placeholder="e.g. 2019"
            value={vintage}
            onChange={(e) => setVintage(e.target.value)}
            min="1900"
            max="2100"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="countryRegion" className="text-foreground font-medium">
            {t("Country / Region")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
          </Label>
          <Input
            id="countryRegion"
            placeholder="e.g. Frankrijk, Bordeaux"
            value={countryRegion}
            onChange={(e) => setCountryRegion(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      {/* Where bought (Purchase location) */}
      <div className="space-y-2">
        <Label htmlFor="purchaseLocation" className="text-foreground font-medium">
          {t("Where bought")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
        </Label>
        <select
          id="purchaseLocation"
          value={purchaseLocation}
          onChange={(e) => setPurchaseLocation(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">-- {t("Select location")} --</option>
          {PURCHASE_LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {t(loc.value)}
            </option>
          ))}
        </select>
      </div>

      {/* Rating Slider/Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rating" className="text-foreground font-medium">
            {t("Rating")} (0-10) <span className="text-muted-foreground font-normal">({t("optional")})</span>
          </Label>
          <span className="text-sm font-bold text-brand">
            {rating !== "" ? `${rating}/10` : "-"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="rating"
            type="range"
            min="0"
            max="10"
            step="1"
            value={rating !== "" ? rating : "5"}
            onChange={(e) => setRating(e.target.value)}
            className="flex-1 accent-brand cursor-pointer"
          />
          {rating !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRating("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("Clear")}
            </Button>
          )}
        </div>
      </div>

      {/* Photo Uploader */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">
          {t("Label photo")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
        </Label>

        {previewUrl || imageUrl ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black/40 border border-border group">
            {/* Display Image (previewUrl or saved imageUrl) */}
            <Image
              src={previewUrl || imageUrl!}
              alt="Wine label"
              fill
              unoptimized={!!previewUrl}
              className="object-contain p-2"
            />

            {/* Overlay during uploading */}
            {isUploading ? (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-3 z-20 animate-in fade-in duration-200">
                <Loader2 className="size-7 text-brand animate-spin" />
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">
                    {uploadStage === "optimizing"
                      ? t("Optimizing photo...")
                      : `${t("Uploading photo...")} ${uploadProgress}%`}
                  </p>
                </div>
                <div className="w-44 sm:w-56 h-2 bg-muted rounded-full overflow-hidden ring-1 ring-foreground/10">
                  <div
                    className="h-full bg-brand transition-all duration-200 ease-out"
                    style={{
                      width: `${uploadStage === "optimizing" ? 15 : uploadProgress}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors z-10"
                title={t("Remove")}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-brand/50 bg-background/50 hover:bg-muted/50 cursor-pointer transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="size-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0c-.693.047-1.332.443-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              <p className="text-xs text-muted-foreground">
                {t("Upload photo")}
              </p>
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} className="hidden" />
          </label>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-foreground font-medium">
          {t("Notes / Why you liked it")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
        </Label>
        <Textarea
          id="notes"
          placeholder="e.g. Fruity notes of blackberry, smooth tannins, pairs wonderfully with grilled steak..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-background resize-y"
        />
      </div>

      {/* Form Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/recipes/wines")}
          disabled={isSaving}
          className="text-sm"
        >
          {t("Cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isUploading}
          className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm font-medium px-5"
        >
          {isSaving ? t("Saving wine...") : wine ? t("Save Changes") : t("Save Wine")}
        </Button>
      </div>
    </form>
  );
}
