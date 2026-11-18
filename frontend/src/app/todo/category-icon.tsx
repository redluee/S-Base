"use client";

import {
  BookOpen,
  Briefcase,
  Camera,
  Car,
  Code,
  Dumbbell,
  Folder,
  Gamepad2,
  GraduationCap,
  Heart,
  House,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Music,
  Palette,
  PawPrint,
  Plane,
  ShoppingCart,
  Sparkles,
  Users,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { DEFAULT_TODO_ICON, type TodoIcon } from "@backend/shared/todo";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: Record<TodoIcon, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  home: House,
  heart: Heart,
  dumbbell: Dumbbell,
  book: BookOpen,
  code: Code,
  cart: ShoppingCart,
  wallet: Wallet,
  plane: Plane,
  car: Car,
  users: Users,
  graduation: GraduationCap,
  music: Music,
  palette: Palette,
  leaf: Leaf,
  wrench: Wrench,
  sparkles: Sparkles,
  utensils: Utensils,
  paw: PawPrint,
  gamepad: Gamepad2,
  camera: Camera,
  lightbulb: Lightbulb,
  zap: Zap,
};

export function CategoryIcon({ icon, color, className }: { icon: TodoIcon | null; color?: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon ?? DEFAULT_TODO_ICON];
  return <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", className)} style={color ? { color } : undefined} />;
}

export function CategoryTile({ icon, color, size = "md" }: { icon: TodoIcon; color: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "md" ? "size-9 rounded-[10px]" : "size-14 rounded-2xl",
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      <CategoryIcon icon={icon} className={size === "md" ? "size-[18px]" : "size-7"} />
    </span>
  );
}
