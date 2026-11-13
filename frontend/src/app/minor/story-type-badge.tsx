import React from "react";
import type { MinorStoryType } from "@/lib/api";

interface StoryTypeDetails {
  code: string;
  name: string;
  color: string;
}

const UNKNOWN_TYPE_COLOR = "#71717a";
export const STORY_TYPE_HOVER_BORDER = "hover:border-[var(--story-type-color)]";
export const STORY_TYPE_HOVER_TEXT = "group-hover:text-[var(--story-type-color)]";

export function getStoryTypeDetails(code: string = "US", storyTypes: MinorStoryType[] = []): StoryTypeDetails {
  const normalizedCode = (code || "US").trim().toUpperCase();
  const type = storyTypes.find((st) => st.code.toUpperCase() === normalizedCode);
  return type
    ? { code: type.code, name: type.name, color: type.color || UNKNOWN_TYPE_COLOR }
    : { code: normalizedCode, name: normalizedCode, color: UNKNOWN_TYPE_COLOR };
}

interface StoryTypeBadgeProps {
  code?: string;
  storyTypes?: MinorStoryType[];
  showName?: boolean;
  fullNameOnly?: boolean;
  hideNameOnMobile?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StoryTypeBadge({
  code = "US",
  storyTypes = [],
  showName = false,
  fullNameOnly = false,
  hideNameOnMobile = false,
  size = "md",
  className = "",
}: StoryTypeBadgeProps) {
  const details = getStoryTypeDetails(code, storyTypes);

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-xs sm:text-sm px-3 py-1.5 gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border leading-none whitespace-nowrap shadow-sm ${
        fullNameOnly ? "font-sans font-semibold" : "font-mono"
      } ${sizeClasses} ${className}`}
      style={{ backgroundColor: `${details.color}20`, color: details.color, borderColor: `${details.color}40` }}
      title={details.name}
    >
      {fullNameOnly ? (
        <span>{details.name}</span>
      ) : (
        <>
          <span className="tracking-wider">{details.code}</span>
          {showName && details.name && (
            <span
              className={`font-sans font-medium text-[11px] opacity-90 border-l border-current/20 pl-1.5 ${
                hideNameOnMobile ? "hidden sm:inline" : ""
              }`}
            >
              {details.name}
            </span>
          )}
        </>
      )}
    </span>
  );
}

export function StoryTypeOptions({ storyTypes }: { storyTypes: MinorStoryType[] }) {
  return storyTypes.map((type) => (
    <option key={type.code} value={type.code}>
      {type.code} - {type.name}
    </option>
  ));
}
