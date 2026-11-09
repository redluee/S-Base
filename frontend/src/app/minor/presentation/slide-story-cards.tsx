import { toExternalHref } from "@/lib/uri";
import { CheckCircle2, Globe, SquareArrowOutUpRight } from "lucide-react";
import { t } from "@/lib/lang";

export function WebsiteLinkCard({
  website,
  storyColor,
  size = "normal",
}: {
  website: { url: string; title: string };
  storyColor: string;
  size?: "normal" | "large";
}) {
  const displayUrl = website.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return (
    <a
      href={toExternalHref(website.url)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group flex items-center justify-between gap-3.5 rounded-2xl bg-zinc-900/85 border hover:bg-zinc-800/90 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
        size === "large" ? "p-4 sm:p-5" : "p-3 sm:p-3.5"
      }`}
      style={{
        borderColor: `${storyColor}40`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
            size === "large" ? "size-11 sm:size-12" : "size-9 sm:size-10"
          }`}
          style={{
            backgroundColor: `${storyColor}18`,
            color: storyColor,
            border: `1px solid ${storyColor}35`,
          }}
        >
          <Globe className={size === "large" ? "size-5 sm:size-6" : "size-4 sm:size-4.5"} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div
            className={`font-bold text-white group-hover:text-brand transition-colors break-words ${
              size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          >
            {website.title}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate max-w-xs sm:max-w-md block group-hover:text-zinc-300">
            {displayUrl}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 pl-2">
        {size === "large" && (
          <span
            className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{
              backgroundColor: `${storyColor}15`,
              color: storyColor,
            }}
          >
            {t("Website openen")}
          </span>
        )}
        <SquareArrowOutUpRight
          className={`text-zinc-400 group-hover:text-white transition-colors ${
            size === "large" ? "size-4.5" : "size-4"
          }`}
        />
      </div>
    </a>
  );
}

export function DocumentLinkCard({
  doc,
  storyColor,
  size = "normal",
}: {
  doc: { url: string; title: string };
  storyColor: string;
  size?: "normal" | "large";
}) {
  return (
    <a
      href={toExternalHref(doc.url)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center justify-between gap-3 rounded-xl bg-zinc-900/90 border hover:bg-zinc-800/90 transition-all group cursor-pointer shadow-md ${
        size === "large" ? "p-4 sm:p-5" : "p-3.5 sm:p-4"
      }`}
      style={{ borderColor: `${storyColor}35` }}
    >
      <span
        className={`font-semibold text-white group-hover:text-brand transition-colors break-words min-w-0 flex-1 ${
          size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm"
        }`}
      >
        {doc.title}
      </span>
      <SquareArrowOutUpRight
        className={`shrink-0 text-zinc-400 group-hover:text-white transition-colors ${
          size === "large" ? "size-4.5" : "size-4"
        }`}
      />
    </a>
  );
}

export function PointsList({
  bullets,
  listStyle,
  storyColor,
  size = "large",
}: {
  bullets: string[];
  listStyle: "bullets" | "steps";
  storyColor: string;
  size?: "large" | "medium";
}) {
  if (bullets.length === 0) {
    return (
      <p className="text-zinc-500 italic text-sm py-2">
        {t("Geen punten opgegeven.")}
      </p>
    );
  }

  return (
    <ul className={size === "large" ? "space-y-4" : "space-y-3"}>
      {bullets.map((bullet, idx) => (
        <li key={idx} className="flex items-start gap-3 sm:gap-4">
          {listStyle === "steps" ? (
            <span
              className={`flex items-center justify-center rounded-lg font-mono font-bold shrink-0 mt-0.5 shadow-sm ${
                size === "large"
                  ? "size-7 sm:size-8 text-sm sm:text-base"
                  : "size-6 text-xs"
              }`}
              style={{
                backgroundColor: `${storyColor}20`,
                color: storyColor,
                border: `1px solid ${storyColor}50`,
              }}
            >
              {idx + 1}
            </span>
          ) : (
            <CheckCircle2
              className={`shrink-0 mt-0.5 ${
                size === "large" ? "size-6 sm:size-7" : "size-5"
              }`}
              style={{ color: storyColor }}
            />
          )}
          <span
            className={`leading-relaxed text-zinc-100 flex-1 font-medium ${
              size === "large" ? "text-base sm:text-xl" : "text-sm sm:text-base"
            }`}
          >
            {bullet}
          </span>
        </li>
      ))}
    </ul>
  );
}
