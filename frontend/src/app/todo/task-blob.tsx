"use client";

export function TaskBlob({ color, filled = false }: { color: string; filled?: boolean }) {
  const rim = `color-mix(in srgb, ${color} 55%, black)`;
  const body = filled ? color : `color-mix(in srgb, ${color} 62%, transparent)`;
  return (
    <span
      aria-hidden="true"
      className="block size-6 rounded-full transition-transform duration-150 group-active:scale-90"
      style={{
        backgroundImage: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85) 0, rgba(255,255,255,0) 30%), radial-gradient(circle at 50% 45%, ${body} 52%, ${rim} 100%)`,
        opacity: filled ? 1 : 0.9,
      }}
    />
  );
}
