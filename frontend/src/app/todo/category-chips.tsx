"use client";

export interface CategorySelection {
  categoryId: number | null;
  projectId: number | null;
}

export interface CategoryChipsProps {
  value: CategorySelection;
  onChange: (value: CategorySelection) => void;
}

export function CategoryChips(_props: CategoryChipsProps) {
  return null;
}
