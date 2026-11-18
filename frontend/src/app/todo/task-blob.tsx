"use client";

export function TaskBlob({ color, filled = false }: { color: string; filled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block size-5 rounded-full border-2"
      style={{ borderColor: color, backgroundColor: filled ? color : "transparent" }}
    />
  );
}
