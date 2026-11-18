import { describe, expect, it } from "bun:test";
import { DUST_COUNT, dustParticles } from "./dust-particles";

const rect = { left: 10, top: 100, width: 360, height: 44 };

describe("dust particles", () => {
  it("spreads tiny particles across the row", () => {
    const particles = dustParticles(rect, 600, () => 0.5);
    expect(particles).toHaveLength(DUST_COUNT);
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(rect.left);
      expect(p.x).toBeLessThanOrEqual(rect.left + rect.width);
      expect(p.size).toBeLessThanOrEqual(4);
      expect(p.delay + p.duration).toBeLessThanOrEqual(600 * 1.15);
    }
  });

  it("uses fewer particles on narrow rows", () => {
    expect(dustParticles({ ...rect, width: 100 }, 600)).toHaveLength(8);
  });
});
