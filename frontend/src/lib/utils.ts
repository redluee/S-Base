import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
}

