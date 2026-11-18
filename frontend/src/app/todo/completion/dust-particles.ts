export const DUST_COUNT = 22;

export interface DustRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DustParticle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
}

export function dustParticles(rect: DustRect, durationMs: number, random: () => number = Math.random): DustParticle[] {
  const count = Math.max(8, Math.min(DUST_COUNT, Math.round(rect.width / 16)));
  return Array.from({ length: count }, (_, i) => {
    const x = rect.left + ((i + random()) / count) * rect.width;
    const y = rect.top + rect.height / 2 + (random() - 0.5) * rect.height * 0.4;
    const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.4;
    const distance = 10 + random() * 26;
    return {
      x,
      y,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance + 6,
      size: 2 + Math.round(random() * 2),
      delay: Math.round(random() * durationMs * 0.15),
      duration: Math.round(durationMs * (0.7 + random() * 0.3)),
    };
  });
}
