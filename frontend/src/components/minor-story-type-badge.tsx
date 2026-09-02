import React from "react";
import type { MinorStoryType } from "@/lib/api";

export interface StoryTypeDetails {
  code: string;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBorderClass: string;
  hoverTextClass: string;
}

export function getStoryTypeDetails(code: string = "US", customTypes: MinorStoryType[] = []): StoryTypeDetails {
  const normalizedCode = (code || "US").trim().toUpperCase();

  // Find in custom types first if available
  const custom = customTypes.find((t) => t.code.toUpperCase() === normalizedCode);

  if (normalizedCode === "US") {
    return {
      code: "US",
      name: custom?.name || "User Story",
      color: "#10b981",
      bgClass: "bg-emerald-500/15",
      textClass: "text-emerald-400",
      borderClass: "border-emerald-500/30",
      hoverBorderClass: "hover:border-emerald-500/50",
      hoverTextClass: "group-hover:text-emerald-400",
    };
  }

  if (normalizedCode === "RS") {
    return {
      code: "RS",
      name: custom?.name || "Research Story",
      color: "#f97316",
      bgClass: "bg-orange-500/15",
      textClass: "text-orange-400",
      borderClass: "border-orange-500/30",
      hoverBorderClass: "hover:border-orange-500/50",
      hoverTextClass: "group-hover:text-orange-400",
    };
  }

  if (normalizedCode === "LS") {
    return {
      code: "LS",
      name: custom?.name || "Learning Story",
      color: "#a855f7",
      bgClass: "bg-purple-500/15",
      textClass: "text-purple-400",
      borderClass: "border-purple-500/30",
      hoverBorderClass: "hover:border-purple-500/50",
      hoverTextClass: "group-hover:text-purple-400",
    };
  }

  if (custom) {
    return {
      code: custom.code,
      name: custom.name,
      color: custom.color || "#00e3a4",
      bgClass: "bg-zinc-800",
      textClass: "text-white",
      borderClass: "border-white/10",
      hoverBorderClass: "hover:border-[var(--story-type-color)]",
      hoverTextClass: "group-hover:text-[var(--story-type-color)]",
    };
  }

  return {
    code: normalizedCode,
    name: normalizedCode,
    color: "#71717a",
    bgClass: "bg-zinc-800",
    textClass: "text-zinc-300",
    borderClass: "border-zinc-700",
    hoverBorderClass: "hover:border-zinc-500/50",
    hoverTextClass: "group-hover:text-zinc-300",
  };
}

interface StoryTypeBadgeProps {
  code?: string;
  storyTypes?: MinorStoryType[];
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StoryTypeBadge({
  code = "US",
  storyTypes = [],
  showName = false,
  size = "md",
  className = "",
}: StoryTypeBadgeProps) {
  const details = getStoryTypeDetails(code, storyTypes);

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-xs sm:text-sm px-3 py-1.5 gap-2",
  }[size];

  const hasStandardClass = ["US", "RS", "LS"].includes(details.code);

  return (
    <span
      className={`inline-flex items-center font-mono font-bold rounded-lg border leading-none whitespace-nowrap shadow-sm ${sizeClasses} ${
        hasStandardClass
          ? `${details.bgClass} ${details.textClass} ${details.borderClass}`
          : ""
      } ${className}`}
      style={
        !hasStandardClass && details.color
          ? {
              backgroundColor: `${details.color}20`,
              color: details.color,
              borderColor: `${details.color}40`,
            }
          : undefined
      }
      title={details.name}
    >
      <span className="tracking-wider">{details.code}</span>
      {showName && details.name && (
        <span className="font-sans font-medium text-[11px] opacity-90 border-l border-current/20 pl-1.5">
          {details.name}
        </span>
      )}
    </span>
  );
}
